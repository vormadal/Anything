/* tslint:disable */
/* eslint-disable */
// @ts-ignore
import { createRecipeStepFromDiscriminatorValue, serializeCreateRecipeStepRequest, type CreateRecipeStepRequest, type RecipeStep } from '../../../../models/index';
// @ts-ignore
import { RecipesItemStepsItemRequestBuilderRequestsMetadata, type RecipesItemStepsItemRequestBuilder } from './item/index';
// @ts-ignore
import { type BaseRequestBuilder, type KeysToExcludeForNavigationMetadata, type NavigationMetadata, type Parsable, type ParsableFactory, type RequestConfiguration, type RequestInformation, type RequestsMetadata } from '@microsoft/kiota-abstractions';

/**
 * Builds and executes requests for operations under /api/recipes/{id}/steps
 */
export interface RecipesItemStepsRequestBuilder extends BaseRequestBuilder<RecipesItemStepsRequestBuilder> {
    /**
     * Gets an item from the steps collection
     * @param stepId Unique identifier of the item
     * @returns {RecipesItemStepsItemRequestBuilder}
     */
     byId(stepId: number) : RecipesItemStepsItemRequestBuilder;
    /**
     * @param requestConfiguration Configuration for the request such as headers, query parameters, and middleware options.
     * @returns {Promise<RecipeStep[]>}
     */
     get(requestConfiguration?: RequestConfiguration<object> | undefined) : Promise<RecipeStep[] | undefined>;
    /**
     * @param body The request body
     * @param requestConfiguration Configuration for the request such as headers, query parameters, and middleware options.
     * @returns {Promise<RecipeStep>}
     */
     post(body: CreateRecipeStepRequest, requestConfiguration?: RequestConfiguration<object> | undefined) : Promise<RecipeStep | undefined>;
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
     toPostRequestInformation(body: CreateRecipeStepRequest, requestConfiguration?: RequestConfiguration<object> | undefined) : RequestInformation;
}
/**
 * Uri template for the request builder.
 */
export const RecipesItemStepsRequestBuilderUriTemplate = "{+baseurl}/api/recipes/{id}/steps";
/**
 * Metadata for all the navigation properties in the request builder.
 */
export const RecipesItemStepsRequestBuilderNavigationMetadata: Record<Exclude<keyof RecipesItemStepsRequestBuilder, KeysToExcludeForNavigationMetadata>, NavigationMetadata> = {
    byId: {
        requestsMetadata: RecipesItemStepsItemRequestBuilderRequestsMetadata,
        pathParametersMappings: ["stepId"],
    },
};
/**
 * Metadata for all the requests in the request builder.
 */
export const RecipesItemStepsRequestBuilderRequestsMetadata: RequestsMetadata = {
    get: {
        uriTemplate: RecipesItemStepsRequestBuilderUriTemplate,
        responseBodyContentType: "application/json",
        adapterMethodName: "sendCollection",
        responseBodyFactory: createRecipeStepFromDiscriminatorValue,
    },
    post: {
        uriTemplate: RecipesItemStepsRequestBuilderUriTemplate,
        responseBodyContentType: "application/json",
        adapterMethodName: "send",
        responseBodyFactory: createRecipeStepFromDiscriminatorValue,
        requestBodyContentType: "application/json",
        requestBodySerializer: serializeCreateRecipeStepRequest,
        requestInformationContentSetMethod: "setContentFromParsable",
    },
};
/* tslint:enable */
/* eslint-enable */
