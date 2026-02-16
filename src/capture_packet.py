from scapy.all import sniff
from queue import Queue
import os

INTERFACE = "eth0"
# case for Linux/MAC
if os.name != 'nt':
    INTERFACE = "en0"

packets = Queue()

def handle(pkt):
    packets.put(pkt)

sniff(iface=INTERFACE, prn=handle, store=False)