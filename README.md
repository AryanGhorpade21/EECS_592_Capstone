# EECS_592_Capstone

A network packet capture and metadata extraction tool that captures packets from a network interface, extracts relevant metadata, and stores it in a SQLite database.

## Description

This project consists of three Python files that work together to:
1. Capture network packets from a specified network interface
2. Extract metadata from captured packets (IP addresses, ports, protocols, timestamps)
3. Store the extracted metadata in a SQLite database for analysis

## Prerequisites

- **Python 3.x**
- **scapy** - Packet manipulation library
- **sqlite3** - Built into Python (no installation needed)
- **Root/sudo privileges** - Required for packet capture on most systems

## Installation

1. Install Python 3 if not already installed
2. Install scapy:
   ```bash
   pip install scapy
   ```

## How to Run

**Note:** Packet capture requires root privileges. Run commands with `sudo` if needed.

### Step 1: Start Packet Capture
Open a terminal and run:
```bash
python capture_packet.py
```
This will start sniffing packets from the network interface `en0` and store them in a queue. Leave this running.

### Step 2: Start Metadata Extraction
Open a second terminal and run:
```bash
python Metadata_extraction.py
```
This will continuously read packets from the queue, extract metadata, and store it in the database.

The database file `packets.db` will be created automatically.

### Stopping
Press `Ctrl+C` in either terminal to stop the respective process.

## Python Files Description

### 1. capture_packet.py
This file is responsible for capturing network packets from a specified network interface. It uses the scapy library to sniff packets and puts them into a queue for processing by the metadata extraction module.

**Key components:**
- `INTERFACE`: Network interface to capture from (default: "en0")
- `packets`: Queue to store captured packets
- `handle()`: Callback function that adds captured packets to the queue

### 2. database.py
This file defines the `PacketDatabase` class that handles all SQLite database operations. It creates a database table to store packet metadata and provides methods for inserting and retrieving data.

**Key components:**
- `PacketDatabase` class with methods:
  - `__init__()`: Initializes database connection
  - `init_db()`: Creates the packets table if it doesn't exist
  - `insert_metadata()`: Inserts packet metadata into the database
  - `get_all_packets()`: Retrieves all packets from the database
  - `close()`: Closes the database connection

**Database Schema:**
| Column     | Type    | Description                |
|------------|---------|----------------------------|
| id         | INTEGER | Primary key (auto-increment) |
| timestamp  | DATETIME| Time of packet capture     |
| src_ip     | TEXT    | Source IP address          |
| dst_ip     | TEXT    | Destination IP address    |
| src_port   | INTEGER | Source port number         |
| dst_port   | INTEGER | Destination port number    |
| protocol   | TEXT    | Protocol (TCP/UDP/other)   |

### 3. Metadata_extraction.py
This file extracts metadata from captured packets and stores them in the database. It reads packets from the queue populated by `capture_packet.py`, processes them to extract relevant information, and inserts the data into the SQLite database.

**Key components:**
- `extract_metadata()`: Extracts timestamp, source/destination IP, source/destination ports, and protocol from a packet
- `main()`: Main loop that continuously processes packets from the queue

**Extracted Metadata:**
- `timestamp`: Date and time of packet capture (format: DD/MM/YYYY HH:MM:SS)
- `src_ip`: Source IP address
- `dst_ip`: Destination IP address
- `src_port`: Source port number
- `dst_port`: Destination port number
- `protocol`: Protocol type (TCP, UDP, or other IP protocol number)

