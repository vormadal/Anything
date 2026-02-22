/* tslint:disable */
/* eslint-disable */
// @ts-ignore
import { serializeUpdateShoppingListItemRequest, type UpdateShoppingListItemRequest } from '../../../../../models/index';
// @ts-ignore
import { type BaseRequestBuilder, type Parsable, type ParsableFactory, type RequestConfiguration, type RequestInformation, type RequestsMetadata } from '@microsoft/kiota-abstractions';

/**
 * Builds and executes requests for operations under /api/shopping-lists/{id}/items/{itemId}
 */
export interface ShoppingListsItemItemsItemRequestBuilder extends BaseRequestBuilder<ShoppingListsItemItemsItemRequestBuilder> {
    /**
     * @param requestConfiguration Configuration for the request such as headers, query parameters, and middleware options.
     */
     delete(requestConfiguration?: RequestConfiguration<object> | undefined) : Promise<void>;
    /**
     * @param body The request body
     * @param requestConfiguration Configuration for the request such as headers, query parameters, and middleware options.
     */
     put(body: UpdateShoppingListItemRequest, requestConfiguration?: RequestConfiguration<object> | undefined) : Promise<void>;
    /**
     * @param requestConfiguration Configuration for the request such as headers, query parameters, and middleware options.
     * @returns {RequestInformation}
     */
     toDeleteRequestInformation(requestConfiguration?: RequestConfiguration<object> | undefined) : RequestInformation;
    /**
     * @param body The request body
     * @param requestConfiguration Configuration for the request such as headers, query parameters, and middleware options.
     * @returns {RequestInformation}
     */
     toPutRequestInformation(body: UpdateShoppingListItemRequest, requestConfiguration?: RequestConfiguration<object> | undefined) : RequestInformation;
}
/**
 * Uri template for the request builder.
 */
export const ShoppingListsItemItemsItemRequestBuilderUriTemplate = "{+baseurl}/api/shopping-lists/{id}/items/{itemId}";
/**
 * Metadata for all the requests in the request builder.
 */
export const ShoppingListsItemItemsItemRequestBuilderRequestsMetadata: RequestsMetadata = {
    delete: {
        uriTemplate: ShoppingListsItemItemsItemRequestBuilderUriTemplate,
        adapterMethodName: "sendNoResponseContent",
    },
    put: {
        uriTemplate: ShoppingListsItemItemsItemRequestBuilderUriTemplate,
        adapterMethodName: "sendNoResponseContent",
        requestBodyContentType: "application/json",
        requestBodySerializer: serializeUpdateShoppingListItemRequest,
        requestInformationContentSetMethod: "setContentFromParsable",
    },
};
/* tslint:enable */
/* eslint-enable */
