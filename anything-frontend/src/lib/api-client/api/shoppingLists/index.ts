/* tslint:disable */
/* eslint-disable */
// @ts-ignore
import { createShoppingListFromDiscriminatorValue, serializeCreateShoppingListRequest, type CreateShoppingListRequest, type ShoppingList } from '../../models/index';
// @ts-ignore
import { ShoppingListsCompletedRequestBuilderRequestsMetadata, type ShoppingListsCompletedRequestBuilder } from './completed/index';
// @ts-ignore
import { ShoppingListsItemRequestBuilderNavigationMetadata, ShoppingListsItemRequestBuilderRequestsMetadata, type ShoppingListsItemRequestBuilder } from './item/index';
// @ts-ignore
import { type BaseRequestBuilder, type KeysToExcludeForNavigationMetadata, type NavigationMetadata, type Parsable, type ParsableFactory, type RequestConfiguration, type RequestInformation, type RequestsMetadata } from '@microsoft/kiota-abstractions';

/**
 * Builds and executes requests for operations under /api/shopping-lists
 */
export interface ShoppingListsRequestBuilder extends BaseRequestBuilder<ShoppingListsRequestBuilder> {
    /**
     * The completed property
     */
    get completed(): ShoppingListsCompletedRequestBuilder;
    /**
     * Gets an item from the ApiSdk.api.shoppingLists.item collection
     * @param id Unique identifier of the item
     * @returns {ShoppingListsItemRequestBuilder}
     */
     byId(id: number) : ShoppingListsItemRequestBuilder;
    /**
     * @param requestConfiguration Configuration for the request such as headers, query parameters, and middleware options.
     * @returns {Promise<ShoppingList[]>}
     */
     get(requestConfiguration?: RequestConfiguration<object> | undefined) : Promise<ShoppingList[] | undefined>;
    /**
     * @param body The request body
     * @param requestConfiguration Configuration for the request such as headers, query parameters, and middleware options.
     * @returns {Promise<ShoppingList>}
     */
     post(body: CreateShoppingListRequest, requestConfiguration?: RequestConfiguration<object> | undefined) : Promise<ShoppingList | undefined>;
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
     toPostRequestInformation(body: CreateShoppingListRequest, requestConfiguration?: RequestConfiguration<object> | undefined) : RequestInformation;
}
/**
 * Uri template for the request builder.
 */
export const ShoppingListsRequestBuilderUriTemplate = "{+baseurl}/api/shopping-lists";
/**
 * Metadata for all the navigation properties in the request builder.
 */
export const ShoppingListsRequestBuilderNavigationMetadata: Record<Exclude<keyof ShoppingListsRequestBuilder, KeysToExcludeForNavigationMetadata>, NavigationMetadata> = {
    completed: {
        requestsMetadata: ShoppingListsCompletedRequestBuilderRequestsMetadata,
    },
    byId: {
        requestsMetadata: ShoppingListsItemRequestBuilderRequestsMetadata,
        navigationMetadata: ShoppingListsItemRequestBuilderNavigationMetadata,
        pathParametersMappings: ["id"],
    },
};
/**
 * Metadata for all the requests in the request builder.
 */
export const ShoppingListsRequestBuilderRequestsMetadata: RequestsMetadata = {
    get: {
        uriTemplate: ShoppingListsRequestBuilderUriTemplate,
        responseBodyContentType: "application/json",
        adapterMethodName: "sendCollection",
        responseBodyFactory: createShoppingListFromDiscriminatorValue,
    },
    post: {
        uriTemplate: ShoppingListsRequestBuilderUriTemplate,
        responseBodyContentType: "application/json",
        adapterMethodName: "send",
        responseBodyFactory: createShoppingListFromDiscriminatorValue,
        requestBodyContentType: "application/json",
        requestBodySerializer: serializeCreateShoppingListRequest,
        requestInformationContentSetMethod: "setContentFromParsable",
    },
};
/* tslint:enable */
/* eslint-enable */

