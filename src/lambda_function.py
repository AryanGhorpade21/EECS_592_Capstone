"""
Date Created: 3/1/2026
Author: Aryan Ghorpade
Revision Date: 3/1/2026
Program Name: lambda_function.py
Program Description:
This is the entry point for the AWS Lambda function. It imports the check_rules function from 
the alert_gentrator module and calls it when the Lambda function is invoked. This file is exclusively 
for AWS Lambda functions. For the AWS environment, the Lambda function will be triggered by an event 
(e.g., a scheduled event or an API call),and it will execute the check_rules function to check for 
any broken rules and send notifications accordingly.
"""
from alert_gentrator import check_rules

def lambda_handler(event, context):
    check_rules()
    return {"status": "Rules checked"}