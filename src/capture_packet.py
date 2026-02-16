''' Prologue Comments 
Artifact: capture_packet.py
Description: Sniffs local traffic and obtains Scapy packet object.
Programmer's name: Mohamed Ashraq
Creation Date: 2/12/2026
Revision Dates:
    2/15/2026: Revised to allow packet capture on different OS systems' network interface.
Preconditions:
    None.
Postconditions:
    Gives packets from queue to Metadata_extraction.py
Errors/Exceptions: none
Side effects: none
Invariants: none
'''

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