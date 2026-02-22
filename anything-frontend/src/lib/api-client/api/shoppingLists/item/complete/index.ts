/* tslint:disable */
/* eslint-disable */
// @ts-ignore
import { createShoppingListFromDiscriminatorValue, type ShoppingList } from '../../../../models/index';
// @ts-ignore
import { type BaseRequestBuilder, type Parsable, type ParsableFactory, type RequestConfiguration, type RequestInformation, type RequestsMetadata } from '@microsoft/kiota-abstractions';

/**
 * Builds and executes requests for operations under /api/shopping-lists/{id}/complete
 */
export interface ShoppingListsItemCompleteRequestBuilder extends BaseRequestBuilder<ShoppingListsItemCompleteRequestBuilder> {
    /**
     * @param requestConfiguration Configuration for the request such as headers, query parameters, and middleware options.
     * @returns {Promise<ShoppingList>}
     */
     post(requestConfiguration?: RequestConfiguration<object> | undefined) : Promise<ShoppingList | undefined>;
    /**
     * @param requestConfiguration Configuration for the request such as headers, query parameters, and middleware options.
     * @returns {RequestInformation}
     */
     toPostRequestInformation(requestConfiguration?: RequestConfiguration<object> | undefined) : RequestInformation;
}
/**
 * Uri template for the request builder.
 */
export const ShoppingListsItemCompleteRequestBuilderUriTemplate = "{+baseurl}/api/shopping-lists/{id}/complete";
/**
 * Metadata for all the requests in the request builder.
 */
export const ShoppingListsItemCompleteRequestBuilderRequestsMetadata: RequestsMetadata = {
    post: {
        uriTemplate: ShoppingListsItemCompleteRequestBuilderUriTemplate,
        responseBodyContentType: "application/json",
        adapterMethodName: "send",
        responseBodyFactory: createShoppingListFromDiscriminatorValue,
    },
};
/* tslint:enable */
/* eslint-enable */
