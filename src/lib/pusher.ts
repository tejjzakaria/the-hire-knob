import PusherClient from "pusher-js";

let instance: PusherClient | null = null;

export function getPusherClient(): PusherClient {
  if (!instance) {
    instance = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });
  }
  return instance;
}
