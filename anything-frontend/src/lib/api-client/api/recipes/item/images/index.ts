/* tslint:disable */
/* eslint-disable */
// @ts-ignore
import { createRecipeImageFromDiscriminatorValue, serializeCreateRecipeImageRequest, type CreateRecipeImageRequest, type RecipeImage } from '../../../../models/index';
// @ts-ignore
import { RecipesItemImagesItemRequestBuilderRequestsMetadata, type RecipesItemImagesItemRequestBuilder } from './item/index';
// @ts-ignore
import { type BaseRequestBuilder, type KeysToExcludeForNavigationMetadata, type NavigationMetadata, type Parsable, type ParsableFactory, type RequestConfiguration, type RequestInformation, type RequestsMetadata } from '@microsoft/kiota-abstractions';

/**
 * Builds and executes requests for operations under /api/recipes/{id}/images
 */
export interface RecipesItemImagesRequestBuilder extends BaseRequestBuilder<RecipesItemImagesRequestBuilder> {
    /**
     * Gets an item from the images collection
     * @param imageId Unique identifier of the item
     * @returns {RecipesItemImagesItemRequestBuilder}
     */
     byId(imageId: number) : RecipesItemImagesItemRequestBuilder;
    /**
     * @param requestConfiguration Configuration for the request such as headers, query parameters, and middleware options.
     * @returns {Promise<RecipeImage[]>}
     */
     get(requestConfiguration?: RequestConfiguration<object> | undefined) : Promise<RecipeImage[] | undefined>;
    /**
     * @param body The request body
     * @param requestConfiguration Configuration for the request such as headers, query parameters, and middleware options.
     * @returns {Promise<RecipeImage>}
     */
     post(body: CreateRecipeImageRequest, requestConfiguration?: RequestConfiguration<object> | undefined) : Promise<RecipeImage | undefined>;
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
     toPostRequestInformation(body: CreateRecipeImageRequest, requestConfiguration?: RequestConfiguration<object> | undefined) : RequestInformation;
}
/**
 * Uri template for the request builder.
 */
export const RecipesItemImagesRequestBuilderUriTemplate = "{+baseurl}/api/recipes/{id}/images";
/**
 * Metadata for all the navigation properties in the request builder.
 */
export const RecipesItemImagesRequestBuilderNavigationMetadata: Record<Exclude<keyof RecipesItemImagesRequestBuilder, KeysToExcludeForNavigationMetadata>, NavigationMetadata> = {
    byId: {
        requestsMetadata: RecipesItemImagesItemRequestBuilderRequestsMetadata,
        pathParametersMappings: ["imageId"],
    },
};
/**
 * Metadata for all the requests in the request builder.
 */
export const RecipesItemImagesRequestBuilderRequestsMetadata: RequestsMetadata = {
    get: {
        uriTemplate: RecipesItemImagesRequestBuilderUriTemplate,
        responseBodyContentType: "application/json",
        adapterMethodName: "sendCollection",
        responseBodyFactory: createRecipeImageFromDiscriminatorValue,
    },
    post: {
        uriTemplate: RecipesItemImagesRequestBuilderUriTemplate,
        responseBodyContentType: "application/json",
        adapterMethodName: "send",
        responseBodyFactory: createRecipeImageFromDiscriminatorValue,
        requestBodyContentType: "application/json",
        requestBodySerializer: serializeCreateRecipeImageRequest,
        requestInformationContentSetMethod: "setContentFromParsable",
    },
};
/* tslint:enable */
/* eslint-enable */
