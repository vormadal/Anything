/* tslint:disable */
/* eslint-disable */
// @ts-ignore
import { createShoppingListItemFromDiscriminatorValue, serializeCreateShoppingListItemRequest, type CreateShoppingListItemRequest, type ShoppingListItem } from '../../../../models/index';
// @ts-ignore
import { ShoppingListsItemItemsItemRequestBuilderRequestsMetadata, type ShoppingListsItemItemsItemRequestBuilder } from './item/index';
// @ts-ignore
import { type BaseRequestBuilder, type KeysToExcludeForNavigationMetadata, type NavigationMetadata, type Parsable, type ParsableFactory, type RequestConfiguration, type RequestInformation, type RequestsMetadata } from '@microsoft/kiota-abstractions';

/**
 * Builds and executes requests for operations under /api/shopping-lists/{id}/items
 */
export interface ShoppingListsItemItemsRequestBuilder extends BaseRequestBuilder<ShoppingListsItemItemsRequestBuilder> {
    /**
     * Gets an item from the items collection
     * @param itemId Unique identifier of the item
     * @returns {ShoppingListsItemItemsItemRequestBuilder}
     */
     byId(itemId: number) : ShoppingListsItemItemsItemRequestBuilder;
    /**
     * @param requestConfiguration Configuration for the request such as headers, query parameters, and middleware options.
     * @returns {Promise<ShoppingListItem[]>}
     */
     get(requestConfiguration?: RequestConfiguration<object> | undefined) : Promise<ShoppingListItem[] | undefined>;
    /**
     * @param body The request body
     * @param requestConfiguration Configuration for the request such as headers, query parameters, and middleware options.
     * @returns {Promise<ShoppingListItem>}
     */
     post(body: CreateShoppingListItemRequest, requestConfiguration?: RequestConfiguration<object> | undefined) : Promise<ShoppingListItem | undefined>;
    /**
     * @param requestConfiguration Configuration for the request such as headers, query parameters, and middleware options.
     * @returns {RequestInformation}
     */
     toGetRequestInformation(requestConfiguration?: RequestConfiguration<object> | undefined) : RequestInformation;
    /**
     * @param body The request body
     * @param requestConfiguration Configuration for the request such as headers, query parameters, and middleware options.
     * @returns {RequestInformation}
     */
     toPostRequestInformation(body: CreateShoppingListItemRequest, requestConfiguration?: RequestConfiguration<object> | undefined) : RequestInformation;
}
/**
 * Uri template for the request builder.
 */
export const ShoppingListsItemItemsRequestBuilderUriTemplate = "{+baseurl}/api/shopping-lists/{id}/items";
/**
 * Metadata for all the navigation properties in the request builder.
 */
export const ShoppingListsItemItemsRequestBuilderNavigationMetadata: Record<Exclude<keyof ShoppingListsItemItemsRequestBuilder, KeysToExcludeForNavigationMetadata>, NavigationMetadata> = {
    byId: {
        requestsMetadata: ShoppingListsItemItemsItemRequestBuilderRequestsMetadata,
        pathParametersMappings: ["itemId"],
    },
};
/**
 * Metadata for all the requests in the request builder.
 */
export const ShoppingListsItemItemsRequestBuilderRequestsMetadata: RequestsMetadata = {
    get: {
        uriTemplate: ShoppingListsItemItemsRequestBuilderUriTemplate,
        responseBodyContentType: "application/json",
        adapterMethodName: "sendCollection",
        responseBodyFactory: createShoppingListItemFromDiscriminatorValue,
    },
    post: {
        uriTemplate: ShoppingListsItemItemsRequestBuilderUriTemplate,
        responseBodyContentType: "application/json",
        adapterMethodName: "send",
        responseBodyFactory: createShoppingListItemFromDiscriminatorValue,
        requestBodyContentType: "application/json",
        requestBodySerializer: serializeCreateShoppingListItemRequest,
        requestInformationContentSetMethod: "setContentFromParsable",
    },
};
/* tslint:enable */
/* eslint-enable */
