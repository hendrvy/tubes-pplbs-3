import json
import os
import random
import signal
import time
from datetime import datetime, timezone
def main():
    signal.signal(signal.SIGINT, stop)
    signal.signal(signal.SIGTERM, stop)


    tick = 0
    while running:
        tick += 1
        for zone in ZONES:
            publish(client, f"city/{zone}/crowd", crowd)
            publish(client, f"city/{zone}/security", security)
            publish(client, f"city/{zone}/environment", environment)
        time.sleep(PUBLISH_INTERVAL_SECONDS)
    client.loop_stop()
    client.disconnect()


if __name__ == "__main__":
    main()