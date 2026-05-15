import net from "node:net";

export type PingResult = {
  ok: boolean;
  reachable: boolean;
  latencyMs?: number;
  error?: string;
};

export const pingTcp = (host: string, port: number, timeoutMs = 2000): Promise<PingResult> =>
  new Promise((resolve) => {
    const started = Date.now();
    const socket = new net.Socket();
    let finished = false;

    const done = (result: PingResult) => {
      if (finished) {
        return;
      }
      finished = true;
      socket.destroy();
      resolve(result);
    };

    socket.setTimeout(timeoutMs);
    socket.once("connect", () => {
      done({
        ok: true,
        reachable: true,
        latencyMs: Date.now() - started
      });
    });
    socket.once("timeout", () => {
      done({
        ok: false,
        reachable: false,
        error: `timeout after ${timeoutMs}ms`
      });
    });
    socket.once("error", (err) => {
      done({
        ok: false,
        reachable: false,
        error: err.message
      });
    });

    socket.connect(port, host);
  });
