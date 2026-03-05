/* tslint:disable */
/* eslint-disable */
// @ts-ignore
import { createShoppingListFromDiscriminatorValue, type ShoppingList } from '../../../models/index';
// @ts-ignore
import { type BaseRequestBuilder, type RequestConfiguration, type RequestInformation, type RequestsMetadata } from '@microsoft/kiota-abstractions';

/**
 * Builds and executes requests for operations under /api/shopping-lists/completed
 */
export interface ShoppingListsCompletedRequestBuilder extends BaseRequestBuilder<ShoppingListsCompletedRequestBuilder> {
    /**
     * @param requestConfiguration Configuration for the request such as headers, query parameters, and middleware options.
     * @returns {Promise<ShoppingList[]>}
     */
     get(requestConfiguration?: RequestConfiguration<object> | undefined) : Promise<ShoppingList[] | undefined>;
    /**
     * @param requestConfiguration Configuration for the request such as headers, query parameters, and middleware options.
     * @returns {RequestInformation}
     */
     toGetRequestInformation(requestConfiguration?: RequestConfiguration<object> | undefined) : RequestInformation;
}
/**
 * Uri template for the request builder.
 */
export const ShoppingListsCompletedRequestBuilderUriTemplate = "{+baseurl}/api/shopping-lists/completed";
/**
 * Metadata for all the requests in the request builder.
 */
export const ShoppingListsCompletedRequestBuilderRequestsMetadata: RequestsMetadata = {
    get: {
        uriTemplate: ShoppingListsCompletedRequestBuilderUriTemplate,
        responseBodyContentType: "application/json",
        adapterMethodName: "sendCollection",
        responseBodyFactory: createShoppingListFromDiscriminatorValue,
    },
};
/* tslint:enable */
/* eslint-enable */
