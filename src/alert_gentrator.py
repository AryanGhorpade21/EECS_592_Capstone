"""
Author: Aryan Ghorpade
Date: 2/15/2026
Revision Date: 2/15/2026
Program Name: alert_gentrator.py

Program Description:    
Generates alerts notifications for broken rules detected by rules_parser.py.
and sends a PUT request to AWS SNS topic with the alert details.
"""
import boto3
import src.rules_parser

def send_sns_notification(topic_arn, message, phone_number=+17857275025):
    sns_client = boto3.client('sns')
    response = sns_client.publish(
        TopicArn=topic_arn,
        Message=message,
        PhoneNumber=phone_number
    )
    return response

def check_rules():
    rules = src.rules_parser.load_rules()
    for rule in rules:
        if not rule.is_valid():
            send_sns_notification(topic_arn, f"Broken rule detected: {rule.id}", phone_number=+17857275025)

# Example usage
topic_arn = 'arn:aws:sns:us-east-1:123456789012:my-topic'

check_rules()