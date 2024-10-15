from sqlalchemy import Column, Integer, String, create_engine
from sqlalchemy.orm import Session, sessionmaker
from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import docker
import dns.resolver
from models import Base
# Create the database tables
from database import SessionLocal, engine
Base.metadata.create_all(bind=engine)

app = FastAPI()
docker_client = docker.from_env()

@app.middleware("http")
async def add_cors_headers(request: Request, call_next):
    response = await call_next(request)
    origin = request.headers.get('origin')
    if origin:
        response.headers['Access-Control-Allow-Origin'] = origin
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Authorization, Content-Type'
    return response

# Dependency to get the database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Database request model for creating instances
class DatabaseRequest(BaseModel):
    db_type: str = Field(..., example="mongodb")
    name: str = Field(..., example="my-mongodb")
    user_port: int = Field(..., example=27017)
    internal_port: Optional[int] = None
    env_vars: Dict[str, Any] = Field(default_factory=dict)

# Check if a port is available
def is_port_available(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        result = s.connect_ex(('localhost', port))
        return result != 0

# Get the next available port starting from a given port
def get_available_port(start_port: int) -> int:
    port = start_port
    while port <= 65535:
        if is_port_available(port):
            return port
        port += 1
    raise RuntimeError("No available ports found.")

# Database configurations for supported databases
database_configs = {
    "mysql": {
        "image": "mysql:latest",
        "internal_port": 3306,
        "required_env_vars": ["MYSQL_ROOT_PASSWORD"],
        "optional_env_vars": ["MYSQL_DATABASE", "MYSQL_USER", "MYSQL_PASSWORD"],
        "cmd": []
    },
    "postgresql": {
        "image": "postgres:latest",
        "internal_port": 5432,
        "required_env_vars": ["POSTGRES_PASSWORD"],
        "optional_env_vars": ["POSTGRES_USER", "POSTGRES_DB"],
        "cmd": []
    },
    "mongodb": {
        "image": "mongo:latest",
        "internal_port": 27017,
        "required_env_vars": [],
        "optional_env_vars": ["MONGO_INITDB_ROOT_USERNAME", "MONGO_INITDB_ROOT_PASSWORD"],
        "cmd": []
    },
    "redis": {
        "image": "redis:latest",
        "internal_port": 6379,
        "required_env_vars": [],
        "optional_env_vars": [],
        "cmd": []
    },
    "mariadb": {
        "image": "mariadb:latest",
        "internal_port": 3306,
        "required_env_vars": ["MYSQL_ROOT_PASSWORD"],
        "optional_env_vars": ["MYSQL_DATABASE", "MYSQL_USER", "MYSQL_PASSWORD"],
        "cmd": []
    }
}
@app.post("/databases")
def create_database(db_request: DatabaseRequest, db: Session = Depends(get_db)):
    print("Received database creation request:", db_request.dict())
    db_type = db_request.db_type.lower()
    
        
    if db_type not in database_configs:
        raise HTTPException(status_code=400, detail="Unsupported database type.")

    config = database_configs[db_type]

    # Set internal port if not provided
    internal_port = db_request.internal_port or config["internal_port"]

    # Check required environment variables
    env_vars = db_request.env_vars.copy()
    for var in config["required_env_vars"]:
        if var not in env_vars:
            raise HTTPException(status_code=400, detail=f"Missing required environment variable: {var}")

    # Check if the desired port is available
    port = db_request.user_port
    if not is_port_available(port):
        port = get_available_port(port + 1)
        return {"error": f"Port {db_request.user_port} is in use.", "next_available_port": port}

    # Pull the image
    try:
        docker_client.images.pull(config["image"])
    except docker.errors.APIError as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Labels for Traefik
    labels = {
        "traefik.enable": "true",
        f"traefik.http.services.{db_request.name}.loadbalancer.server.port": str(internal_port),
        f"traefik.http.routers.{db_request.name}.entrypoints": "web",
        f"traefik.http.routers.{db_request.name}.rule": f"Host(`{db_request.name}.example.com`)"
    }

    # Port bindings
    ports = {f"{internal_port}/tcp": port}

    # Command
    cmd = config.get("cmd", [])

    # Create and start the container
    try:
        container = docker_client.containers.run(
            config["image"],
            name=db_request.name,
            environment=env_vars,
            ports=ports,
            labels=labels,
            command=cmd,
            detach=True,
            restart_policy={"Name": "always"}
        )
    except docker.errors.APIError as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Store the created instance information in the database, including env_vars
    db_instance = DatabaseInstance(
        name=db_request.name,
        db_type=db_type,
        user_port=port,
        internal_port=internal_port,
        status="running",
        env_vars=env_vars  # Save environment variables
    )
    db.add(db_instance)
    db.commit()
    db.refresh(db_instance)

    return {"message": "Database created", "id": container.id, "port": port}

@app.get("/databases")
def list_databases(db: Session = Depends(get_db)):
    instances = db.query(DatabaseInstance).all()
    result = []
    for instance in instances:
        result.append({
            "id": instance.id,
            "name": instance.name,
            "db_type": instance.db_type,
            "user_port": instance.user_port,
            "internal_port": instance.internal_port,
            "status": instance.status,
            "created_at": instance.created_at
        })
    return result

@app.get("/databases/{name}")
def get_database(name: str, db: Session = Depends(get_db)):
    db_instance = db.query(DatabaseInstance).filter(DatabaseInstance.name == name).first()
    if db_instance is None:
        raise HTTPException(status_code=404, detail="Database not found")
    return {
        "id": db_instance.id,
        "name": db_instance.name,
        "db_type": db_instance.db_type,
        "user_port": db_instance.user_port,
        "internal_port": db_instance.internal_port,
        "status": db_instance.status,
        "created_at": db_instance.created_at
    }

@app.delete("/databases/{name}")
def delete_database(name: str, db: Session = Depends(get_db)):
    db_instance = db.query(DatabaseInstance).filter(DatabaseInstance.name == name).first()
    if db_instance is None:
        raise HTTPException(status_code=404, detail="Database not found")

    # Delete the Docker container
    try:
        container = docker_client.containers.get(name)
        container.stop()
        container.remove()
    except docker.errors.NotFound:
        raise HTTPException(status_code=404, detail="Container not found")
    except docker.errors.APIError as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Delete the entry from the database
    db.delete(db_instance)
    db.commit()

    return {"message": "Database deleted"}

@app.put("/databases/{name}/status")
def update_database_status(name: str, new_status: str, db: Session = Depends(get_db)):
    db_instance = db.query(DatabaseInstance).filter(DatabaseInstance.name == name).first()
    if db_instance is None:
        raise HTTPException(status_code=404, detail="Database not found")

    # Check if the container exists and update the status accordingly
    try:
        container = docker_client.containers.get(name)
        if new_status.lower() == "stopped":
            container.stop()
            db_instance.status = "stopped"
        elif new_status.lower() == "running":
            container.start()
            db_instance.status = "running"
        else:
            raise HTTPException(status_code=400, detail="Invalid status. Use 'running' or 'stopped'.")
    except docker.errors.NotFound:
        raise HTTPException(status_code=404, detail="Container not found")
    except docker.errors.APIError as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Commit the status update to the database
    db.commit()
    db.refresh(db_instance)

    return {"message": f"Database status updated to {new_status}", "name": name}

class UpdateDatabaseRequest(BaseModel):
    new_env_vars: Optional[Dict[str, str]] = None
    new_user_port: Optional[int] = None
    new_internal_port: Optional[int] = None
@app.put("/databases/{name}/update")
def update_database(name: str, update_request: UpdateDatabaseRequest, db: Session = Depends(get_db)):
    # Retrieve the existing database instance from SQLite
    db_instance = db.query(DatabaseInstance).filter(DatabaseInstance.name == name).first()
    if db_instance is None:
        raise HTTPException(status_code=404, detail="Database not found")

    # Stop and remove the existing Docker container
    try:
        container = docker_client.containers.get(name)
        container.stop()
        container.remove()
    except docker.errors.NotFound:
        raise HTTPException(status_code=404, detail="Container not found")
    except docker.errors.APIError as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Update environment variables
    env_vars = update_request.new_env_vars if update_request.new_env_vars else {}
    if db_instance.db_type in database_configs:
        config = database_configs[db_instance.db_type]
        for required_var in config["required_env_vars"]:
            if required_var not in env_vars and required_var not in db_instance.env_vars:
                raise HTTPException(status_code=400, detail=f"Missing required environment variable: {required_var}")

    # Merge old and new environment variables
    existing_env_vars = db_instance.env_vars if db_instance.env_vars else {}
    updated_env_vars = {**existing_env_vars, **env_vars}

    # Update ports
    user_port = update_request.new_user_port if update_request.new_user_port else db_instance.user_port
    internal_port = update_request.new_internal_port if update_request.new_internal_port else db_instance.internal_port

    # Check if the new desired user port is available
    if not is_port_available(user_port):
        user_port = get_available_port(user_port + 1)

    # Pull the Docker image again (optional, to ensure the latest version)
    try:
        docker_client.images.pull(config["image"])
    except docker.errors.APIError as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Labels for Traefik
    labels = {
        "traefik.enable": "true",
        f"traefik.http.services.{name}.loadbalancer.server.port": str(internal_port),
        f"traefik.http.routers.{name}.entrypoints": "web",
        f"traefik.http.routers.{name}.rule": f"Host(`{name}.example.com`)"
    }

    # Port bindings
    ports = {f"{internal_port}/tcp": user_port}

    # Create and start the container with updated settings
    try:
        container = docker_client.containers.run(
            config["image"],
            name=name,
            environment=updated_env_vars,
            ports=ports,
            labels=labels,
            detach=True,
            restart_policy={"Name": "always"}
        )
    except docker.errors.APIError as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Update the SQLite database record
    db_instance.user_port = user_port
    db_instance.internal_port = internal_port
    db_instance.env_vars = updated_env_vars  # Save updated environment variables
    db_instance.status = "running"
    db.commit()
    db.refresh(db_instance)

    return {"message": "Database container updated successfully", "id": container.id, "port": user_port}



class UpdateSettingRequest(BaseModel):
    domain: str

@app.put("/settings/1")
def update_setting(id: int, setting: UpdateSettingRequest, db: Session = Depends(get_db)):
    db_setting = db.query(Setting).filter(Setting.id == id).first()
    if db_setting is None:
        raise HTTPException(status_code=404, detail="Setting not found")

    db_setting.domain = setting.domain

    # Check if the domain points to the server
    server_ip = docker_client.api.inspect_container("traefik")['NetworkSettings']['IPAddress']
    try:
        domain_ips = dns.resolver.resolve(setting.domain, 'A')
        verified = any(str(ip) == server_ip for ip in domain_ips)
        db_setting.status = "verified" if verified else "not verified"
    except dns.resolver.NXDOMAIN:
        db_setting.status = "not verified"
    except dns.resolver.NoAnswer:
        db_setting.status = "not verified"

    db.commit()
    db.refresh(db_setting)

    # Update Traefik to route domain to Next.js app
    try:
        container = docker_client.containers.get("nextjs_app")
        container.stop()
        container.remove()

        # Start container with updated label for new domain
        docker_client.containers.run(
            "nextjs_app_image",  # Replace with the actual Next.js image name used in Docker Compose
            name="nextjs_app",
            ports={"3000/tcp": 3000},
            labels={
                "traefik.enable": "true",
                f"traefik.http.routers.nextjs-app.rule": f"Host(`{setting.domain}`)",
                "traefik.http.services.nextjs-app.loadbalancer.server.port": "3000"
            },
            network="traefik_network",
            detach=True,
            restart_policy={"Name": "always"}
        )
    except docker.errors.APIError as e:
        raise HTTPException(status_code=500, detail=f"Failed to update Traefik: {str(e)}")

    return db_setting