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
            localPeerId = urlParams.get('peerid');
            console.log(localPeerId);

            setupPerge();
        } else {
            // Get headless client peer id from service discovery
            requestHeadlessPeerId()
                .then(peerId => {
                    headlessPeerId = peerId;

                    localPeerId = uuidv4()
                    console.log(localPeerId);

                    setupPerge();
                })
                .catch(error => console.log(error));

            // When list of peers currently connected to headless client received -- register event
            // connectToPeers();
        }
    });

    function setupPerge() {
        const peer = window.peer = new Peer(localPeerId, {
            host:'peerjs-server.herokuapp.com', secure:true, port:443
        })

        let docSet = window.docSet = new Automerge.DocSet()

        instance = window.instance = new Perge(localPeerId, {
            decode: JSON.parse, // msgpack or protobuf would also be a good option
            encode: JSON.stringify,
            peer: peer,
            docSet: docSet
        })

        // This handler gets invoked whenever the DocSet is updated, useful for re-rendering views.
        instance.subscribe(() => {
            console.log(JSON.stringify(docSet.docs, null, 2))
        })
    }

    function setupEvents() {
        instance.peer.on('open', (id) => {
            console.log('open - ID: ' + id);
        });

        instance.peer.on('connection', (connection) => {
            console.log("Connected to: " + connection.peer);

            connection.on('data', function (data) {
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

    function update() {
        const id = 'docid'
        // Update the document
        const doc = instance.select(id)(change, d => {
            d.now = new Date().valueOf()
        })
    }

    function connect (e) {
        e.preventDefault()

        instance.connect(headlessPeerId, peer.connect(headlessPeerId))
        console.log(JSON.stringify(
            Array.from(peer._connections.keys()
            ), null, 2))
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

{#if headlessPeerId}
<button on:click={connect}>Connect</button>
{/if}

<button on:click={update}>Update</button>