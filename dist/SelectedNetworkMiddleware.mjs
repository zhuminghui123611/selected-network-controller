import { SelectedNetworkControllerActionTypes } from "./SelectedNetworkController.mjs";
export const createSelectedNetworkMiddleware = (messenger) => {
    const getNetworkClientIdForDomain = (origin) => messenger.call(SelectedNetworkControllerActionTypes.getNetworkClientIdForDomain, origin);
    return (req, _, next) => {
        if (!req.origin) {
            throw new Error("Request object is lacking an 'origin'");
        }
        req.networkClientId = getNetworkClientIdForDomain(req.origin);
        return next();
    };
};
//# sourceMappingURL=SelectedNetworkMiddleware.mjs.map