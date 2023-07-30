
export const DBLIST=[
    {
        "name":"mongo DB",
        "dockerImage":"mongo",
        "tags":["latest","4.4.6"],
        "ENV":["MONGO_INITDB_ROOT_USERNAME","MONGO_INITDB_ROOT_PASSWORD"],
        "PORT":27017

    },
    {
        "name":"mysql DB",
        "dockerImage":"mysql",
        "tags":["latest","8.0.33","8"],
        "ENV":["MYSQL_ROOT_PASSWORD","MYSQL_USER","MYSQL_PASSWORD","MYSQL_DATABASE"],
        "PORT":3306
    },
    {
        "name":"postgres DB",
        "dockerImage":"postgres",
        "tags":["latest","13.11","13","12","12.15"],
        "ENV":["POSTGRES_PASSWORD","POSTGRES_USER","POSTGRES_DB"],
        "PORT":5432
        

    },
    {
        "name":"mariadb DB",
        "dockerImage":"mariadb",
        "tags":["lts","10.6.31","10.6","10.5"],
        "ENV":["MARIADB_USER","MARIADB_PASSWORD","MARIADB_ROOT_PASSWORD","MARIADB_DATABASE"],
        "PORT":3308
       
    }
]

export const getDB=(name)=>{
    
    return DBLIST.find(db=>db.dockerImage===name)
}