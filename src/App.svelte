<script>
    import {onMount} from 'svelte';

    import {v4 as uuidv4} from 'uuid';
    import Perge from 'perge';
    import Automerge, {change} from 'automerge'
    import Peer from 'peerjs';

    import {getServicesAtLocation} from 'ssd-access';
    import {getCurrentLocation} from "./utilities";


    // The peer ID of the headless client
    let headlessPeerId;

    // Peer ID of this app instance
    let localPeerId;

    // Value to be synced between the peers
    let valueToSync

    let instance;
    let docSet;

    let connection;


    // Runs at startup of the app
    onMount(() => {
        const urlParams = new URLSearchParams(location.search);

        if (urlParams.has('peerid')) {
            // Defines the headless client
            // This ID needs to be registered with service discovery
            localPeerId = uuidv4();     // urlParams.get('peerid');
            console.log(localPeerId);

            // Register with Signaling Server
            connectToSignalingServer(localPeerId);
            setupEvents();

            console.log('headless setup done');
        } else {
            // Get headless client peer id from service discovery
            requestHeadlessPeerId()
                .then(peerId => {
                    headlessPeerId = peerId;
                    connectToHeadlessClient();

                    console.log('client setup done')
                })
                .catch(error => console.log(error));

            // When list of peers currently connected to headless client received -- register event
            connectToPeers();
        }
    });

    function setupEvents() {
        instance.peer.on('open', (id) => {
            console.log('open - ID: ' + id);
        });

        instance.peer.on('connection', (connection) => {
            console.log("Connected to: " + connection.peer);

            connection.on('data', function(data) {
                console.log('Received', data);
            });
        });

        instance.peer.on('disconnected', () => {
            console.log('Connection disconnected.');
        });

        instance.peer.on('close', () => {
            console.log('Connection closed.');
        });

        instance.peer.on('error', (error) => {
            console.error(error)
        })

        instance.subscribe(() => {
            console.log(JSON.stringify(docSet.docs, null, 2));
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
        setupEvents();

        // Connect to headless client
        connection = instance.connect(headlessPeerId, instance.peer.connect(headlessPeerId));
    }

    function connectToPeers() {
        // Connect to peers with id received from headless client
    }

    docSet = window.docSet = new Automerge.DocSet();
    function connectToSignalingServer(peerId) {
        const peer = window.peer = new Peer(peerId, {
            host:'peerjs-server.herokuapp.com', secure:true, port:443
            // debug: 2,
            // host: 'rtc.oscp.cloudpose.io',
            // port: 5678,
            // key: 'peerjs-mvtest',
            // path: '/'
        });
        instance = window.instance = new Perge(peerId, {
            peer: peer,
            docSet: docSet
        });
    }

    function sendData() {
        const doc = instance.select('docid')(change, d => {
            d.now = new Date().valueOf()
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

<button on:click={sendData}>Send</button>