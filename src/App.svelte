<script>
    import {onMount} from 'svelte';

    import { v4 as uuidv4 } from 'uuid';
    import Perge from 'perge';
    import Automerge, { change } from 'automerge';
    import Peer from 'peerjs';

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

    let perge;
    let docSet;

    let connections = [];


    // Runs at startup of the app
    onMount(() => {
        const queryString = window.location.search;
        const urlParams = new URLSearchParams(queryString);

        if (urlParams.has('peerid')) {
            // Defines the headless client
            // This ID needs to be registered with service discovery
            localPeerId = urlParams.get('peerid');

            // Register with Signaling Server
            connectToSignalingServer(localPeerId);
            subscribeToDocs();
            setupPeerEvents();

            console.log('headless setup done');
        } else {
            // Get headless client peer id from service discovery
            requestHeadlessPeerId()
                .then(peerId => {
                    headlessPeerId = peerId;
                    connectToHeadlessClient();
                    subscribeToDocs();
                    setupPeerEvents();

                    console.log('client setup done')
                })
                .catch(error => console.log(error));

            // When list of peers currently connected to headless client received -- register event
            connectToPeers();
        }
    });

    function setupPeerEvents() {
        perge.peer.on('open', () => {
            console.log('ID: ' + perge.peer.id);
        });

        perge.peer.on('connection', (newConnection) => {
            connections.push(newConnection);
            console.log("Connected to: " + newConnection.peer);
        });

        perge.peer.on('error', (error) => {
            console.error(error)
        })
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
        // Initialize perge connection with client id
        localPeerId = uuidv4();
        connectToSignalingServer(localPeerId);

        // Connect to headless client
        perge.connect(headlessPeerId);

        subscribeToDocs();
    }

    function connectToPeers() {
        // Connect to peers with id received from headless client
    }

    function connectToSignalingServer(peerId) {
        let docSet = new Automerge.DocSet();
        const peer = new Peer(peerId, {
            // debug: 2,
            // host: 'rtc.oscp.cloudpose.io',
            // port: 5678,
            // key: 'peerjs-mvtest',
            // path: '/'
        });
        perge = new Perge(peerId, {
            peer: peer,
            docSet: docSet
        });
    }

    function subscribeToDocs() {
        perge.subscribe(() => {
            console.log(JSON.stringify(docSet.docs, null, 2));
        })
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
