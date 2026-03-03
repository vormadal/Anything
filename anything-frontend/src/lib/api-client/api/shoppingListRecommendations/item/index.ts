/* tslint:disable */
/* eslint-disable */
// @ts-ignore
import { serializeUpdateRecommendationRequest, type UpdateRecommendationRequest } from '../../../models/index';
// @ts-ignore
import { ApproveRequestBuilderRequestsMetadata, type ApproveRequestBuilder } from './approve/index';
// @ts-ignore
import { type BaseRequestBuilder, type KeysToExcludeForNavigationMetadata, type NavigationMetadata, type Parsable, type ParsableFactory, type RequestConfiguration, type RequestInformation, type RequestsMetadata } from '@microsoft/kiota-abstractions';

/**
 * Builds and executes requests for operations under /api/shopping-list-recommendations/{id}
 */
export interface ShoppingListRecommendationsItemRequestBuilder extends BaseRequestBuilder<ShoppingListRecommendationsItemRequestBuilder> {
    /**
     * The approve property
     */
    get approve(): ApproveRequestBuilder;
    /**
     * @param requestConfiguration Configuration for the request such as headers, query parameters, and middleware options.
     * @returns {Promise<void>}
     */
     delete(requestConfiguration?: RequestConfiguration<object> | undefined) : Promise<void>;
    /**
     * @param body The request body
     * @param requestConfiguration Configuration for the request such as headers, query parameters, and middleware options.
     * @returns {Promise<void>}
     */
     put(body: UpdateRecommendationRequest, requestConfiguration?: RequestConfiguration<object> | undefined) : Promise<void>;
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
     toPutRequestInformation(body: UpdateRecommendationRequest, requestConfiguration?: RequestConfiguration<object> | undefined) : RequestInformation;
}
/**
 * Uri template for the request builder.
 */
export const ShoppingListRecommendationsItemRequestBuilderUriTemplate = "{+baseurl}/api/shopping-list-recommendations/{id}";
/**
 * Metadata for all the navigation properties in the request builder.
 */
export const ShoppingListRecommendationsItemRequestBuilderNavigationMetadata: Record<Exclude<keyof ShoppingListRecommendationsItemRequestBuilder, KeysToExcludeForNavigationMetadata>, NavigationMetadata> = {
    approve: {
        requestsMetadata: ApproveRequestBuilderRequestsMetadata,
    },
};
/**
 * Metadata for all the requests in the request builder.
 */
export const ShoppingListRecommendationsItemRequestBuilderRequestsMetadata: RequestsMetadata = {
    delete: {
        uriTemplate: ShoppingListRecommendationsItemRequestBuilderUriTemplate,
        adapterMethodName: "sendNoResponseContent",
    },
    put: {
        uriTemplate: ShoppingListRecommendationsItemRequestBuilderUriTemplate,
        adapterMethodName: "sendNoResponseContent",
        requestBodyContentType: "application/json",
        requestBodySerializer: serializeUpdateRecommendationRequest,
        requestInformationContentSetMethod: "setContentFromParsable",
    },
};
/* tslint:enable */
/* eslint-enable */
