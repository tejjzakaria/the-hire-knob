import PusherClient from "pusher-js";

// --------- returns a pusher client -----------
export function getPusherClient(): PusherClient {
  const client = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  });
  return client;
}
