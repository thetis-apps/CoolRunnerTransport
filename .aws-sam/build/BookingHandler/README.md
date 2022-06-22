# Introduction

This application enables the printing of shipping labels from the carrier CoolRunner as an integrated part of your packing process. 

# Installation

You may install the latest version of the application from the Serverless Applicaation Repository. It is registered under the name thetis-ims-coolrunner-transport.

## Parameters

When installing the application you must provide values for the following parameters:

- ContextId
- ThetisClientId
- ThetisClientSecret
- ApiKey
- DevOpsEmail

A short explanation for each of these parameters are provided upon installation.

## Initialization

Upon installation the application creates a carrier by the name 'CoolRunner'.

# Configuration

In the data document of the carrier named 'CoolRunner':
```
{
  "CoolRunnerTransport": {
    "userName": "xxxxxxxxxxxxxxxxxxx",
    "token": "xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  }
}
```

It is possible to overwrite this configuration for individual sales channels by entering a similar object in the data document of the sales channel.

For your convenience the application is initially configured to use our test credentials. You may use this configuration as long as you keep the value of the test attribute to true.

To get your own credentials contact CoolRunner.

# CoolRunner specific options

The value of the terms of delivery field of the shipment must contain the name of the subcarrier. Contact CoolRunner to get a list of subcarriers.

# Events

## Packing completed

When packing of a shipment is completed, the application registers the shipment with CoolRunner. The shipment is updated with the carriers shipment number. 
Since CoolRunner consider each shipping container a separate shipment, the shipment is updated with the value '<none>'.

The shipping containers are updated with the tracking numbers assigned by CoolRunner.

Shipping labels are attached to the shipment.








