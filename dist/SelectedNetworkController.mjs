var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _SelectedNetworkController_instances, _SelectedNetworkController_domainProxyMap, _SelectedNetworkController_registerMessageHandlers, _SelectedNetworkController_setNetworkClientIdForDomain, _SelectedNetworkController_unsetNetworkClientIdForDomain, _SelectedNetworkController_domainHasPermissions;
import { BaseController } from "@metamask/base-controller";
import { createEventEmitterProxy } from "@metamask/swappable-obj-proxy";
export const controllerName = 'SelectedNetworkController';
const stateMetadata = {
    domains: {
        includeInStateLogs: true,
        persist: true,
        anonymous: false,
        usedInUi: true,
    },
};
const getDefaultState = () => ({ domains: {} });
export const METAMASK_DOMAIN = 'metamask';
export const SelectedNetworkControllerActionTypes = {
    getState: `${controllerName}:getState`,
    getNetworkClientIdForDomain: `${controllerName}:getNetworkClientIdForDomain`,
    setNetworkClientIdForDomain: `${controllerName}:setNetworkClientIdForDomain`,
};
export const SelectedNetworkControllerEventTypes = {
    stateChange: `${controllerName}:stateChange`,
};
/**
 * Controller for getting and setting the network for a particular domain.
 */
export class SelectedNetworkController extends BaseController {
    /**
     * Construct a SelectedNetworkController controller.
     *
     * @param options - The controller options.
     * @param options.messenger - The restricted messenger for the EncryptionPublicKey controller.
     * @param options.state - The controllers initial state.
     * @param options.domainProxyMap - A map for storing domain-specific proxies that are held in memory only during use.
     */
    constructor({ messenger, state = getDefaultState(), domainProxyMap, }) {
        super({
            name: controllerName,
            metadata: stateMetadata,
            messenger,
            state,
        });
        _SelectedNetworkController_instances.add(this);
        _SelectedNetworkController_domainProxyMap.set(this, void 0);
        __classPrivateFieldSet(this, _SelectedNetworkController_domainProxyMap, domainProxyMap, "f");
        __classPrivateFieldGet(this, _SelectedNetworkController_instances, "m", _SelectedNetworkController_registerMessageHandlers).call(this);
        // this is fetching all the dapp permissions from the PermissionsController and looking for any domains that are not in domains state in this controller. Then we take any missing domains and add them to state here, setting it with the globally selected networkClientId (fetched from the NetworkController)
        this.messagingSystem
            .call('PermissionController:getSubjectNames')
            .filter((domain) => this.state.domains[domain] === undefined)
            .forEach((domain) => this.setNetworkClientIdForDomain(domain, this.messagingSystem.call('NetworkController:getState')
            .selectedNetworkClientId));
        this.messagingSystem.subscribe('PermissionController:stateChange', (_, patches) => {
            patches.forEach(({ op, path }) => {
                const isChangingSubject = path[0] === 'subjects' && path[1] !== undefined;
                if (isChangingSubject && typeof path[1] === 'string') {
                    const domain = path[1];
                    if (op === 'add' && this.state.domains[domain] === undefined) {
                        this.setNetworkClientIdForDomain(domain, this.messagingSystem.call('NetworkController:getState')
                            .selectedNetworkClientId);
                    }
                    else if (op === 'remove' &&
                        this.state.domains[domain] !== undefined) {
                        __classPrivateFieldGet(this, _SelectedNetworkController_instances, "m", _SelectedNetworkController_unsetNetworkClientIdForDomain).call(this, domain);
                    }
                }
            });
        });
        this.messagingSystem.subscribe('NetworkController:stateChange', ({ selectedNetworkClientId, networkConfigurationsByChainId }, patches) => {
            const patch = patches.find(({ op, path }) => (op === 'replace' || op === 'remove') &&
                path[0] === 'networkConfigurationsByChainId');
            if (patch) {
                const networkClientIdToChainId = Object.values(networkConfigurationsByChainId).reduce((acc, network) => {
                    network.rpcEndpoints.forEach(({ networkClientId }) => (acc[networkClientId] = network.chainId));
                    return acc;
                }, {});
                Object.entries(this.state.domains).forEach(([domain, networkClientIdForDomain]) => {
                    const chainIdForDomain = networkClientIdToChainId[networkClientIdForDomain];
                    if (patch.op === 'remove' && !chainIdForDomain) {
                        // If the network was removed, fall back to the globally selected network
                        this.setNetworkClientIdForDomain(domain, selectedNetworkClientId);
                    }
                    else if (patch.op === 'replace') {
                        // If the network was updated, redirect to the network's default endpoint
                        const updatedChainId = patch.path[1];
                        if (!chainIdForDomain || chainIdForDomain === updatedChainId) {
                            const network = networkConfigurationsByChainId[updatedChainId];
                            const { networkClientId: defaultNetworkClientId } = network.rpcEndpoints[network.defaultRpcEndpointIndex];
                            if (networkClientIdForDomain !== defaultNetworkClientId) {
                                this.setNetworkClientIdForDomain(domain, defaultNetworkClientId);
                            }
                        }
                    }
                });
            }
        });
    }
    setNetworkClientIdForDomain(domain, networkClientId) {
        if (domain === METAMASK_DOMAIN) {
            throw new Error(`NetworkClientId for domain "${METAMASK_DOMAIN}" cannot be set on the SelectedNetworkController`);
        }
        if (!__classPrivateFieldGet(this, _SelectedNetworkController_instances, "m", _SelectedNetworkController_domainHasPermissions).call(this, domain)) {
            throw new Error('NetworkClientId for domain cannot be called with a domain that has not yet been granted permissions');
        }
        __classPrivateFieldGet(this, _SelectedNetworkController_instances, "m", _SelectedNetworkController_setNetworkClientIdForDomain).call(this, domain, networkClientId);
    }
    getNetworkClientIdForDomain(domain) {
        const { selectedNetworkClientId: metamaskSelectedNetworkClientId } = this.messagingSystem.call('NetworkController:getState');
        return this.state.domains[domain] ?? metamaskSelectedNetworkClientId;
    }
    /**
     * Accesses the provider and block tracker for the currently selected network.
     *
     * @param domain - the domain for the provider
     * @returns The proxy and block tracker proxies.
     */
    getProviderAndBlockTracker(domain) {
        // If the domain is 'metamask', return the NetworkController's globally selected network client proxy
        if (domain === METAMASK_DOMAIN) {
            const networkClient = this.messagingSystem.call('NetworkController:getSelectedNetworkClient');
            if (networkClient === undefined) {
                throw new Error('Selected network not initialized');
            }
            return networkClient;
        }
        let networkProxy = __classPrivateFieldGet(this, _SelectedNetworkController_domainProxyMap, "f").get(domain);
        if (networkProxy === undefined) {
            let networkClient;
            if (__classPrivateFieldGet(this, _SelectedNetworkController_instances, "m", _SelectedNetworkController_domainHasPermissions).call(this, domain)) {
                const networkClientId = this.getNetworkClientIdForDomain(domain);
                networkClient = this.messagingSystem.call('NetworkController:getNetworkClientById', networkClientId);
            }
            else {
                networkClient = this.messagingSystem.call('NetworkController:getSelectedNetworkClient');
                if (networkClient === undefined) {
                    throw new Error('Selected network not initialized');
                }
            }
            networkProxy = {
                provider: createEventEmitterProxy(networkClient.provider),
                blockTracker: createEventEmitterProxy(networkClient.blockTracker, {
                    eventFilter: 'skipInternal',
                }),
            };
            __classPrivateFieldGet(this, _SelectedNetworkController_domainProxyMap, "f").set(domain, networkProxy);
        }
        return networkProxy;
    }
}
_SelectedNetworkController_domainProxyMap = new WeakMap(), _SelectedNetworkController_instances = new WeakSet(), _SelectedNetworkController_registerMessageHandlers = function _SelectedNetworkController_registerMessageHandlers() {
    this.messagingSystem.registerActionHandler(SelectedNetworkControllerActionTypes.getNetworkClientIdForDomain, this.getNetworkClientIdForDomain.bind(this));
    this.messagingSystem.registerActionHandler(SelectedNetworkControllerActionTypes.setNetworkClientIdForDomain, this.setNetworkClientIdForDomain.bind(this));
}, _SelectedNetworkController_setNetworkClientIdForDomain = function _SelectedNetworkController_setNetworkClientIdForDomain(domain, networkClientId) {
    const networkClient = this.messagingSystem.call('NetworkController:getNetworkClientById', networkClientId);
    // This needs to happen before getProviderAndBlockTracker,
    // otherwise we may be referencing a network client ID that no longer exists.
    this.update((state) => {
        state.domains[domain] = networkClientId;
    });
    const networkProxy = this.getProviderAndBlockTracker(domain);
    networkProxy.provider.setTarget(networkClient.provider);
    networkProxy.blockTracker.setTarget(networkClient.blockTracker);
}, _SelectedNetworkController_unsetNetworkClientIdForDomain = function _SelectedNetworkController_unsetNetworkClientIdForDomain(domain) {
    const globallySelectedNetworkClient = this.messagingSystem.call('NetworkController:getSelectedNetworkClient');
    const networkProxy = __classPrivateFieldGet(this, _SelectedNetworkController_domainProxyMap, "f").get(domain);
    if (networkProxy && globallySelectedNetworkClient) {
        networkProxy.provider.setTarget(globallySelectedNetworkClient.provider);
        networkProxy.blockTracker.setTarget(globallySelectedNetworkClient.blockTracker);
    }
    else if (networkProxy) {
        __classPrivateFieldGet(this, _SelectedNetworkController_domainProxyMap, "f").delete(domain);
    }
    this.update((state) => {
        delete state.domains[domain];
    });
}, _SelectedNetworkController_domainHasPermissions = function _SelectedNetworkController_domainHasPermissions(domain) {
    return this.messagingSystem.call('PermissionController:hasPermissions', domain);
};
//# sourceMappingURL=SelectedNetworkController.mjs.map