/* tslint:disable */
/* eslint-disable */
// @ts-ignore
import { createShoppingListRecommendationFromDiscriminatorValue, serializeCreateRecommendationRequest, type CreateRecommendationRequest, type ShoppingListRecommendation } from '../../models/index';
// @ts-ignore
import { AllRequestBuilderRequestsMetadata, type AllRequestBuilder } from './all/index';
// @ts-ignore
import { ShoppingListRecommendationsItemRequestBuilderNavigationMetadata, ShoppingListRecommendationsItemRequestBuilderRequestsMetadata, type ShoppingListRecommendationsItemRequestBuilder } from './item/index';
// @ts-ignore
import { PendingRequestBuilderRequestsMetadata, type PendingRequestBuilder } from './pending/index';
// @ts-ignore
import { type BaseRequestBuilder, type KeysToExcludeForNavigationMetadata, type NavigationMetadata, type Parsable, type ParsableFactory, type RequestConfiguration, type RequestInformation, type RequestsMetadata } from '@microsoft/kiota-abstractions';

/**
 * Builds and executes requests for operations under /api/shopping-list-recommendations
 */
export interface ShoppingListRecommendationsRequestBuilder extends BaseRequestBuilder<ShoppingListRecommendationsRequestBuilder> {
    /**
     * The all property
     */
    get all(): AllRequestBuilder;
    /**
     * Gets an item from the ApiSdk.api.shoppingListRecommendations.item collection
     * @param id Unique identifier of the item
     * @returns {ShoppingListRecommendationsItemRequestBuilder}
     */
     byId(id: number) : ShoppingListRecommendationsItemRequestBuilder;
    /**
     * The pending property
     */
    get pending(): PendingRequestBuilder;
    /**
     * @param requestConfiguration Configuration for the request such as headers, query parameters, and middleware options.
     * @returns {Promise<ShoppingListRecommendation[]>}
     */
     get(requestConfiguration?: RequestConfiguration<object> | undefined) : Promise<ShoppingListRecommendation[] | undefined>;
    /**
     * @param body The request body
     * @param requestConfiguration Configuration for the request such as headers, query parameters, and middleware options.
     * @returns {Promise<ShoppingListRecommendation>}
     */
     post(body: CreateRecommendationRequest, requestConfiguration?: RequestConfiguration<object> | undefined) : Promise<ShoppingListRecommendation | undefined>;
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
     toPostRequestInformation(body: CreateRecommendationRequest, requestConfiguration?: RequestConfiguration<object> | undefined) : RequestInformation;
}
/**
 * Uri template for the request builder.
 */
export const ShoppingListRecommendationsRequestBuilderUriTemplate = "{+baseurl}/api/shopping-list-recommendations";
/**
 * Metadata for all the navigation properties in the request builder.
 */
export const ShoppingListRecommendationsRequestBuilderNavigationMetadata: Record<Exclude<keyof ShoppingListRecommendationsRequestBuilder, KeysToExcludeForNavigationMetadata>, NavigationMetadata> = {
    all: {
        requestsMetadata: AllRequestBuilderRequestsMetadata,
    },
    byId: {
        requestsMetadata: ShoppingListRecommendationsItemRequestBuilderRequestsMetadata,
        navigationMetadata: ShoppingListRecommendationsItemRequestBuilderNavigationMetadata,
        pathParametersMappings: ["id"],
    },
    pending: {
        requestsMetadata: PendingRequestBuilderRequestsMetadata,
    },
};
/**
 * Metadata for all the requests in the request builder.
 */
export const ShoppingListRecommendationsRequestBuilderRequestsMetadata: RequestsMetadata = {
    get: {
        uriTemplate: ShoppingListRecommendationsRequestBuilderUriTemplate,
        responseBodyContentType: "application/json",
        adapterMethodName: "sendCollection",
        responseBodyFactory: createShoppingListRecommendationFromDiscriminatorValue,
    },
    post: {
        uriTemplate: ShoppingListRecommendationsRequestBuilderUriTemplate,
        responseBodyContentType: "application/json",
        adapterMethodName: "send",
        responseBodyFactory: createShoppingListRecommendationFromDiscriminatorValue,
        requestBodyContentType: "application/json",
        requestBodySerializer: serializeCreateRecommendationRequest,
        requestInformationContentSetMethod: "setContentFromParsable",
    },
};
/* tslint:enable */
/* eslint-enable */
