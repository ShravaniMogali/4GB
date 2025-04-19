/**
 * @typedef {Object} Location
 * @property {number} lat - Latitude
 * @property {number} lng - Longitude
 * @property {string} [address] - Optional address string
 */

/**
 * @typedef {'farmer' | 'transporter' | 'distributor' | 'retailer'} UserRole
 */

/**
 * @typedef {Object} User
 * @property {string} id - User ID
 * @property {UserRole} role - User role
 * @property {string} name - User's name
 * @property {string} email - User's email
 * @property {string} [phone] - Optional phone number
 * @property {string} [companyName] - Optional company name
 */

/**
 * @typedef {'truck' | 'van' | 'bike'} VehicleType
 */

/**
 * @typedef {Object} Vehicle
 * @property {string} id - Vehicle ID
 * @property {VehicleType} type - Type of vehicle
 * @property {string} registrationNumber - Vehicle registration number
 * @property {number} capacity - Vehicle capacity in kg
 * @property {Location} [currentLocation] - Current vehicle location
 */

/**
 * @typedef {'created' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'completed'} ConsignmentStatusType
 */

/**
 * @typedef {Object} StatusUpdate
 * @property {ConsignmentStatusType} status - Current status
 * @property {string} timestamp - ISO timestamp
 * @property {{id: string, role: string}} updatedBy - User who updated the status
 * @property {Location} location - Location where status was updated
 * @property {string} [notes] - Optional notes about the status update
 */

/**
 * @typedef {'A' | 'B' | 'C'} QualityGrade
 */

/**
 * @typedef {Object} Consignment
 * @property {string} id - Consignment ID
 * @property {string} farmerId - Farmer ID
 * @property {string} [transporterId] - Transporter ID
 * @property {string} distributorId - Distributor ID
 * @property {string} [retailerId] - Retailer ID
 * @property {string} vegetableName - Name of vegetable
 * @property {number} quantity - Quantity
 * @property {string} unit - Unit of measurement
 * @property {number} price - Price
 * @property {string} harvestDate - Harvest date ISO string
 * @property {string} expectedDeliveryDate - Expected delivery date ISO string
 * @property {ConsignmentStatusType} status - Current status
 * @property {Location} currentLocation - Current location
 * @property {Location} pickupLocation - Pickup location
 * @property {Location} dropoffLocation - Delivery location
 * @property {Array<StatusUpdate>} trackingHistory - History of status updates
 * @property {string} [qrCode] - QR code data
 * @property {string} [specialInstructions] - Special handling instructions
 * @property {QualityGrade} quality - Quality grade
 * @property {number} [temperature] - Temperature in Celsius
 * @property {number} [humidity] - Humidity percentage
 */

// Export empty object as this is just for JSDoc definitions
export default {}; 