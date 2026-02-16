from scapy.all import sniff
from queue import Queue

INTERFACE = "en0"

packets = Queue()

def handle(pkt):
    packets.put(pkt)

sniff(iface=INTERFACE, prn=handle, store=False)