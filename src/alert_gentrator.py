"""
Author: Aryan Ghorpade
Date: 2/15/2026
Revision Date: 3/1/2026
Program Name: alert_gentrator.py

Program Description:    
Generates alerts notifications for broken rules detected by rules_parser.py.
and sends a PUT request to AWS SNS topic with the alert details.
"""
import boto3
import rules_parser

# Configuration
TOPIC_ARN = 'arn:aws:sns:us-east-1:981743521769:my-topic'
PHONE_NUMBER = '+17857275025'  # Update this number as needed

def send_sns_notification(message, phone_number=PHONE_NUMBER):
    sns_client = boto3.client('sns')
    response = sns_client.publish(
        PhoneNumber=phone_number,   # SMS directly to phone — no TopicArn needed
        Message=message
    )
    return response

def check_rules():
    rules = src.rules_parser.load_rules()
    for rule in rules:
        if not rule.is_valid():
            send_sns_notification(f"Broken rule detected: {rule.id}")

check_rules()