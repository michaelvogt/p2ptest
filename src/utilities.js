import * as h3 from "h3-js";
import { supportedCountries } from 'ssd-access';



export function getCurrentLocation() {
    return new Promise((resolve, reject) => {
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition((position) => {
                const latAngle = position.coords.latitude;
                const lonAngle = position.coords.longitude;

                fetch(`https://nominatim.openstreetmap.org/reverse?
                        lat=${latAngle}&lon=${lonAngle}&format=json&zoom=1&email=info%40michaelvogt.eu`)
                    .then((response) => {
                        if (response.ok) {
                            return response.json();
                        } else {
                            reject(response.text());
                        }
                    })
                    .then((data) => {
                        const countryCode = data.address.country_code;
                        resolve({
                            h3Index: h3.geoToH3(latAngle, lonAngle, 8),
                            lat: latAngle,
                            lon: lonAngle,
                            regionCode: supportedCountries.includes(countryCode) ? countryCode : 'us'
                        })
                    })
                    .catch((error) => {
                        reject(error.message());
                    });
            }, (error) => {
                console.log(`Location request failed: ${error}`)
                reject(error);
            }, {
                enableHighAccuracy: false,
                maximumAge: 0
            });
        } else {
            reject('Location is not available');
        }
    });
}