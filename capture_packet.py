from scapy.all import sniff
from queue import Queue

INTERFACE = "eth0"

packets = Queue()

def handle(pkt):
    packets.put(pkt)

sniff(iface=INTERFACE, prn=handle, store=False)