// Geocoding helper for converting addresses to coordinates
'use strict';

import { Client } from '@googlemaps/google-maps-services-js';

const client = new Client({});

/**
 * Geocode an address to get latitude and longitude
 * @param {string} address - The address to geocode
 * @returns {Promise<{latitude: number, longitude: number, formattedAddress: string} | null>}
 */
export async function geocodeAddress(address) {
    if (!address || typeof address !== 'string' || !address.trim()) {
        return null;
    }

    const apiKey = process.env.GOOGLE_GEOCODING_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
        console.warn('Google Maps API key not configured. Geocoding skipped.');
        return null;
    }

    try {
        // Enhance generic campus locations with "University of Toronto" context
        let enhancedAddress = address.trim();
        
        // Handle special cases
        if (enhancedAddress.toLowerCase().includes('campus-wide')) {
            enhancedAddress = 'University of Toronto, Toronto, ON, Canada';
        } else {
            // Only enhance known campus locations - let Google handle everything else
            const campusLocations = [
                'Hart House', 'Sid Smith', 'Bahen Centre', 'Innis', 'Robarts',
                'Myhal Centre', 'Athletic Centre', 'Convocation Hall', 'Back Campus'
            ];
            const isCampusLocation = campusLocations.some(loc => 
                enhancedAddress.toLowerCase().includes(loc.toLowerCase())
            );
            
            // Only add UofT context for known campus locations that don't already have it
            if (isCampusLocation && !enhancedAddress.toLowerCase().includes('university of toronto')) {
                enhancedAddress = `${enhancedAddress}, University of Toronto, Toronto, ON, Canada`;
            }
            // For all other addresses, let Google Geocoding API handle it directly
            // Google is smart enough to geocode "Reykjavik, Iceland", "Paris, France", etc. without help
        }
        
        const response = await client.geocode({
            params: {
                address: enhancedAddress,
                key: apiKey,
            },
        });

        if (response.data.status === 'OK' && response.data.results.length > 0) {
            const result = response.data.results[0];
            const location = result.geometry.location;
            
            return {
                latitude: location.lat,
                longitude: location.lng,
                formattedAddress: result.formatted_address,
            };
        } else {
            console.warn(`Geocoding failed for "${address}": ${response.data.status}`);
            return null;
        }
    } catch (err) {
        console.error('Geocoding error:', err.message);
        return null;
    }
}
