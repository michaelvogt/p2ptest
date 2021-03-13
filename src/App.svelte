<script>
    import {onMount} from 'svelte';

    import {getServicesAtLocation} from 'ssd-access';

    import {getCurrentLocation} from "./utilities";


    // The peer ID of the headless client
    let headlessPeerId;

    // Peer ID of this app instance
    let localPeerId;

    // Peer IDs of connected peers
    let connectedPeers;

    // Value to be synced between the peers
    let valueToSync


    // Runs at startup of the app
    onMount(() => {
        const queryString = window.location.search;
        const urlParams = new URLSearchParams(queryString);

        if (urlParams.has('peerid')) {
            // Defines the headless client
            // This ID needs to be registered with service discovery
            localPeerId = urlParams.get('peerid');

            // Register with Signaling Server
            connectToSignalingServer();
        } else {
            // Get headless client peer id from service discovery
            requestHeadlessPeerId()
                .then(peerId => {
                    headlessPeerId = peerId;
                    connectToHeadlessClient();
                })
                .catch(error => console.log(error));

            // When list of peers currently connected to headless client received -- register event
            connectToPeers();
        }
    });


    function connectToSignalingServer() {

    }

    function requestHeadlessPeerId() {
        let found = false;

        return new Promise((resolve, reject) => {
            getCurrentLocation()
                .then(currentLocation => getServicesAtLocation(currentLocation.regionCode, currentLocation.h3Index))
                .then(data => {
                    data.forEach(ssr => {
                        ssr.services
                            .forEach(service => {
                                if (service.type === 'p2p-master') {
                                    found = true;

                                    console.log(service.description);
                                    resolve(service.description);
                                }
                            })
                    });

                    if (!found) {
                        reject('No headless peer id found')
                    }
                })
                .catch(error => {
                    console.log(error);
                    reject(error);
                });
        });
    }

    function connectToHeadlessClient() {

    }

    function connectToPeers() {
        // Connect to peers with id received from headless client
    }
</script>

<style>
    :global(body) {
        margin: 0;
        font-family: Arial, Helvetica, sans-serif;
    }
</style>

<div>
    <h1>p2p test</h1>
    <input type="number" bind:value={valueToSync}/>
</div>
