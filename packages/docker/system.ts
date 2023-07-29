import net from "net";

export async function findOpenPort(
  startPort: number,
  endPort: number
): Promise<number> {
  for (let port = startPort; port <= endPort; port++) {
    const server = net.createServer();

    try {
      await new Promise<void>((resolve, reject) => {
        server.listen(port);
        server.on("listening", () => {
          server.close();
          resolve();
        });
        server.on("error", (error) => {
          server.close();
          reject(error);
        });
      });

      return port;
    } catch (error) {
      // Ignore error and continue to next port
    }
  }

  throw new Error("No open ports available");
}