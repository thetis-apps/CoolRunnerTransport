/**
 * Copyright 2021 Thetis Apps Aps
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * 
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * 
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const axios = require('axios');

var AWS = require('aws-sdk');
AWS.config.update({region:'eu-west-1'});

const eu = ["BE","GR","LT","PT",
			"BG","ES","LU","RO","CZ","FR","HU","SI","DK","HR","MT","SK",
			"DE","IT","NL","FI","EE","CY","AT","SE","IE","LV","PL"];

/**
 * Send a response to CloudFormation regarding progress in creating resource.
 */
async function sendResponse(input, context, responseStatus, reason) {

	let responseUrl = input.ResponseURL;

	let output = new Object();
	output.Status = responseStatus;
	output.PhysicalResourceId = "StaticFiles";
	output.StackId = input.StackId;
	output.RequestId = input.RequestId;
	output.LogicalResourceId = input.LogicalResourceId;
	output.Reason = reason;
	await axios.put(responseUrl, output);
}

exports.initializer = async (input, context) => {
	
	try {
		let ims = await getIMS();
		let requestType = input.RequestType;
		if (requestType == "Create") {
			let carrier = new Object();
			carrier.carrierName = "CoolRunner";
		    let setup = new Object();
			setup.userName = "lmp@thetis-apps.com";
			setup.token = "iyfms93z8jwicyn3scby9ww1e1wvvqq4";
			let dataDocument = new Object();
			dataDocument.CoolRunnerTransport = setup;
			carrier.dataDocument = JSON.stringify(dataDocument);
			await ims.post("carriers", carrier);
		}
		await sendResponse(input, context, "SUCCESS", "OK");

	} catch (error) {
		await sendResponse(input, context, "SUCCESS", JSON.stringify(error));
	}

};

async function getPack() {
	
	const apiUrl = "https://public.thetis-pack.com/rest";
	
	let apiKey = process.env.ApiKey;  
    let pack = axios.create({
    		baseURL: apiUrl,
    		headers: { "ThetisAccessToken": apiKey, "Content-Type": "application/json" }
    	});
	
	pack.interceptors.response.use(function (response) {
			console.log("SUCCESS " + JSON.stringify(response.data));
 	    	return response;
		}, function (error) {
			console.log(JSON.stringify(error));
			if (error.response) {
				console.log("FAILURE " + error.response.status + " - " + JSON.stringify(error.response.data));
			}
	    	return Promise.reject(error);
		});

	return pack;
}

async function getIMS() {
	
    const authUrl = "https://auth.thetis-ims.com/oauth2/";
    const apiUrl = "https://api.thetis-ims.com/2/";

	let clientId = process.env.ClientId;   
	let clientSecret = process.env.ClientSecret; 
	let apiKey = process.env.ApiKey;  
	
    let data = clientId + ":" + clientSecret;
	let base64data = Buffer.from(data, 'UTF-8').toString('base64');	
	
	let imsAuth = axios.create({
			baseURL: authUrl,
			headers: { Authorization: "Basic " + base64data, 'Content-Type': "application/x-www-form-urlencoded" },
			responseType: 'json'
		});
    
    let response = await imsAuth.post("token", 'grant_type=client_credentials');
    let token = response.data.token_type + " " + response.data.access_token;
    
    let ims = axios.create({
    		baseURL: apiUrl,
    		headers: { "Authorization": token, "x-api-key": apiKey, "Content-Type": "application/json" }
    	});
	

	ims.interceptors.response.use(function (response) {
			console.log("SUCCESS " + JSON.stringify(response.data));
 	    	return response;
		}, function (error) {
			console.log(JSON.stringify(error));
			if (error.response) {
				console.log("FAILURE " + error.response.status + " - " + JSON.stringify(error.response.data));
			}
	    	return Promise.reject(error);
		});

	return ims;
}

async function getCoolRunner(setup) {
 
    let coolRunnerUrl = "https://api.coolrunner.dk/v3/";

    let authentication = setup.userName + ':' + setup.token;
    var unifaun = axios.create({
		baseURL: coolRunnerUrl, 
		headers: { "Authorization": "Basic " + new Buffer.from(authentication).toString('base64'), 
				"Content-Type": "application/json",
				"X-Developer-Id": "Thetis Apps ApS" },
		validateStatus: function (status) {
		    return true; // default
		}
	});
	
	unifaun.interceptors.response.use(function (response) {
			console.log("SUCCESS " + JSON.stringify(response.data));
 	    	return response;
		}, function (error) {
			if (error.response) {
				console.log("FAILURE " + error.response.status + " - " + JSON.stringify(error.response.data));
			}
	    	return Promise.reject(error);
		});

	return unifaun;
}

function lookupCarrier(carriers, carrierName) {
	let i = 0;
    let found = false;
    while (!found && i < carriers.length) {
    	let carrier = carriers[i];
    	if (carrier.carrierName == carrierName) {
    		found = true;
    	} else {
    		i++;
    	}	
    }
    
    if (!found) {
    	throw new Error('No carrier by the name ' + carrierName);
    }

	return carriers[i];
}

// Get setup from either carrier or from seller

async function getSetup(entity) {
    let dataDocument = JSON.parse(entity.dataDocument);
	return dataDocument.CoolRunnerTransport;
}

/**
 * A Lambda function that gets shipping labels from CoolRunner.
 */
exports.packingCompletedHandler = async (event, context) => {
	
    console.info(JSON.stringify(event));

    var detail = event.detail;
    var shipmentId = detail.shipmentId;
 
	let ims;
	if (detail.contextId == '278') {
		ims = await getPack();  
	} else {
		ims = await getIMS();
	}
	
    let response = await ims.get("shipments/" + shipmentId);
    let shipment = response.data;
    
    // Get setup up from either seller or carrier
    
    let seller;
    let setup;
    if (shipment.sellerId) {
		response = await ims.get("sellers/" + shipment.sellerId);
	    seller = response.data;
		setup = await getSetup(seller);
    } else {
		response = await ims.get("carriers");
    	let carriers = response.data;
	    let carrier = lookupCarrier(carriers, 'CoolRunner');
		setup = await getSetup(carrier);
    }

	// Get sender address from either seller or context

	let senderAddress;
	let senderContactPerson;
	if (seller) {
		senderAddress = seller.address;
		senderContactPerson = seller.contactPerson;
	} else {
		response = await ims.get("contexts/" + detail.contextId);
		senderAddress = response.data.address;
		senderContactPerson = response.data.contactPerson;
	}
    
	let coolRunner = await getCoolRunner(setup);

	let errors = false;
	let shippingContainers = shipment.shippingContainers;	
	for (let i = 0; i < shippingContainers.length; i++) {
		
		let shippingContainer = shippingContainers[i];

		let coolRunnerShipment = new Object();
	
		// Take sub carrier from termsOfDelivery
		
		let carrier = shipment.termsOfDelivery;
		coolRunnerShipment.carrier = carrier;
	
		// Set sender information
	
		let sender = new Object();
		sender.name = senderAddress.addressee;
		sender.attention = senderAddress.careOf != null ? senderAddress.careOf : "";
		sender.street1 = senderAddress.streetNameAndNumber;
		sender.street2 = senderAddress.districtOrCityArea != null ? senderAddress.districtOrCityArea : "";
		sender.zip_code = senderAddress.postalCode;
		sender.city = senderAddress.cityTownOrVillage;
		sender.country = senderAddress.countryCode;
		if (senderContactPerson) {
			sender.email = senderContactPerson.email;
			sender.phone = senderContactPerson.phoneNumber;
		}
		coolRunnerShipment.sender = sender;
		
		// Set receiver information
		
		let deliveryAddress = shipment.deliveryAddress;
		let contactPerson = shipment.contactPerson;
		
		let receiver = new Object();
		receiver.name = deliveryAddress.addressee;
		receiver.attention = deliveryAddress.careOf != null ? senderAddress.careOf : "";
		receiver.street1 = deliveryAddress.streetNameAndNumber;
		receiver.street2 = deliveryAddress.districtOrCityArea != null ? senderAddress.districtOrCityArea : "";
		receiver.zip_code = deliveryAddress.postalCode;
		receiver.city = deliveryAddress.cityTownOrVillage;
		receiver.country = deliveryAddress.countryCode;
		if (senderContactPerson) {
			receiver.email = contactPerson.email;
			receiver.phone = contactPerson.phoneNumber;
			receiver.notify_sms = contactPerson.mobileNumber;
			receiver.notify_email = contactPerson.email;
		}
		coolRunnerShipment.receiver = receiver;
		
		// Set pick-up point id and carrier service
		
		let carrierService;
		if (shipment.deliverToPickUpPoint) {
			carrierService = 'droppoint';
			coolRunnerShipment.servicepoint_id = shipment.pickUpPointId;
		} else {
			if (carrier == 'dao') {
				carrierService = 'delivery_package';
			} else if (carrier == 'coolrunner') {
				carrierService = 'europe';
			} else {
				carrierService = 'delivery';
			}
		}
		coolRunnerShipment.carrier_service = carrierService;
		
		// Set carrier product - at this time always private
		
		coolRunnerShipment.carrier_product = 'private';
		
		// Set dimensions and weight
		
		let dimensions = shippingContainer.dimensions;
		coolRunnerShipment.width = dimensions.width * 100;
		coolRunnerShipment.height = dimensions.height * 100;
		coolRunnerShipment.length = dimensions.length * 100;
		coolRunnerShipment.weight = shippingContainer.grossWeight * 1000;
		
		// Miscellanous information
		
		coolRunnerShipment.label_format = 'LabelPrint';
		coolRunnerShipment.description = '';
		coolRunnerShipment.comment = '';
		coolRunnerShipment.reference = shipment.shipmentNumber + '#' + i;
		
		// If not within the EU create custom lines
		
		if (!eu.includes(deliveryAddress.countryCode)) {
			
			let orderLines = [];
			let shipmentLines = shipment.shipmentLines;
			for (let i = 0; i < shipmentLines.length; i++) {
				let shipmentLine = shipmentLines[i];
				let salesPrice = shipmentLine.salesPrice;
				let harmonizedSystemCode = shipmentLine.harmonizedSystemCode;
				let customsTariffNumber = shipmentLine.customsTariffNumber;
				if (salesPrice > 0) {
					let orderLine = new Object();
					let customsLines = [];
					orderLine.item_number = shipmentLine.stockKeepingUnit;
					let numItemsPacked = shipmentLine.numItemsPacked;
					orderLine.qty = numItemsPacked;
					let customs = new Object();
					customs.currency_code = shipment.currencyCode;
					customs.origin_country = "DK";
					customs.receiver_tariff = customsTariffNumber != null ? customsTariffNumber : harmonizedSystemCode;
					customs.sender_tariff = harmonizedSystemCode;
					customs.description = shipmentLine.productName;
					if (salesPrice != null && numItemsPacked != null) {
						customs.total_price = salesPrice * numItemsPacked;
					} else {
						customs.total_price = 0;
					}
					let weight = shipmentLine.weight;
					if (weight != null) {
						customs.weight = weight * numItemsPacked * 1000;
					} else {
						customs.weight = 0;
					}
					customsLines.push(customs);
					orderLine.customs = customsLines;
					orderLines.push(orderLine);
				}
			}

			coolRunnerShipment.order_lines = orderLines;	
		}
		
		// Now post to CoolRunner
		
	    response = await coolRunner.post("shipments", coolRunnerShipment);
	
		if (response.status >= 300) {
			
			errors = true;
			
			// Send error messages
			
			let error = response.data;
			let message = new Object();
			message.time = Date.now();
			message.source = "CoolRunnerTransport";
			message.messageType = "ERROR";
			if (error != null && error.message != null) {
				message.messageText = "Failed to register shipment " + shipment.shipmentNumber + " with CoolRunner. CoolRunner says: " + error.message;
			} else {
				message.messageText = "Failed to register shipment " + shipment.shipmentNumber + " with CoolRunner. CoolRunner returned status code " + response.status + " with no error message.";
			}
			message.deviceName = detail.deviceName;
			message.userId = detail.userId;
			await ims.post("events/" + detail.eventId + "/messages", message);
	
		} else {
			
			coolRunnerShipment = response.data;
			
			let labelUri = coolRunnerShipment._links.label;
			response = await coolRunner.get(labelUri, { responseType: 'arraybuffer' });

	    	// Set tracking number on shipping containers and attach labels to shipment

			let shippingLabel = new Object();
			shippingLabel.fileName = "SHIPPING_LABEL_" + shippingContainer.id + ".pdf";
			shippingLabel.base64EncodedContent = response.data.toString('base64');
			await ims.post("shipments/"+ shipmentId + "/attachments", shippingLabel);
			
			let trackingUrl;
			if (shipment.termsOfDelivery == 'royalmail') {
				trackingUrl = 'https://www.royalmail.com/business/track-your-item#/tracking-results/' + coolRunnerShipment.package_number;
			} // To be extended 
			
			await ims.patch("shippingContainers/" + shippingContainer.id, { trackingNumber: coolRunnerShipment.package_number, trackingUrl: trackingUrl });
				
		}
		
	}	
	
	// Set carriers shipment number
	
	if (!errors) {
		
		await ims.patch("shipments/" + shipment.id, { carriersShipmentNumber: '<none>' });
		
		var message = new Object();
		message.time = Date.now();
		message.source = "CoolRunnerTransport";
		message.messageType = "INFO";
		message.messageText = "Labels are ready";
		message.deviceName = detail.deviceName;
		message.userId = detail.userId;
		await ims.post("events/" + detail.eventId + "/messages", message);
	
	}
	
	return "done";

};
