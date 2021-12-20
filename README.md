# Introduction

This application enables the printing of shipping labels from the carrier Budbee as an integrated part of your packing process. 

# Installation

You may install the latest version of the application from the Serverless Applicaation Repository. It is registered under the name thetis-ims-budbee-transport.

## Parameters

When installing the application you must provide values for the following parameters:

- ContextId
- ThetisClientId
- ThetisClientSecret
- ApiKey
- DevOpsEmail

A short explanation for each of these parameters are provided upon installation.

## Initialization

Upon installation the application creates a carrier by the name 'Budbee'.

# Configuration

In the data document of the carrier named 'Budbee':
```
{
  "BudbeeTransport": {
    "test": true,
    "apiKey": "xxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxx",
    "apiSecret": "xxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxx",
    "collectionId": 821
  }
}
```

It is possible to overwrite this configuration for individual sales channels by entering a similar object in the data document of the sales channel.

For your convenience the application is initially configured to use our test credentials. You may use this configuration as long as you keep the value of the test attribute to true.

To get your own credentials contact Budbee.

# Budbee specific options

It is possible to set Budbee specific options by creating an object in the data document of the individual shipments:

```
{
  "BudbeeTransport": {
    "requireSignature": false,
    "additionalServices": {
      "numberOfMissRetries": null,
      "recipientMinimumAge": 0,
      "identificationCheckRequired": false,
      "recipientMustMatchEndCustomer": false
    }
  }
}
```

If no object is contained in the data document of a shipment, the above shown values apply.

# Events

## Packing completed

When packing of a shipment is completed, the application registers the shipment with Budbee. The shipment is updated with the carriers shipment number.

The shipping containers are updated with the tracking numbers assigned to the corresponding Budbee parcels.

Shipping labels are attached to the shipment.

## Delivery note cancelled

When a delivery note is cancelled, the application deletes the corresponding shipment from Budbee. 







