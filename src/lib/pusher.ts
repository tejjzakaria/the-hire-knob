import PusherClient from "pusher-js";

let _client: PusherClient | null = null;

// --------- returns a singleton pusher client -----------
export function getPusherClient(): PusherClient {
  if (!_client) {
    _client = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });
  }
  return _client;
}
