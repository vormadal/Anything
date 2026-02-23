/* tslint:disable */
/* eslint-disable */
// @ts-ignore
import { type BaseRequestBuilder, type Parsable, type ParsableFactory, type RequestConfiguration, type RequestInformation, type RequestsMetadata } from '@microsoft/kiota-abstractions';

/**
 * Builds and executes requests for operations under /api/recipes/{id}/images/{imageId}
 */
export interface RecipesItemImagesItemRequestBuilder extends BaseRequestBuilder<RecipesItemImagesItemRequestBuilder> {
    /**
     * @param requestConfiguration Configuration for the request such as headers, query parameters, and middleware options.
     */
     delete(requestConfiguration?: RequestConfiguration<object> | undefined) : Promise<void>;
    /**
     * @param requestConfiguration Configuration for the request such as headers, query parameters, and middleware options.
     * @returns {RequestInformation}
     */
     toDeleteRequestInformation(requestConfiguration?: RequestConfiguration<object> | undefined) : RequestInformation;
}
/**
 * Uri template for the request builder.
 */
export const RecipesItemImagesItemRequestBuilderUriTemplate = "{+baseurl}/api/recipes/{id}/images/{imageId}";
/**
 * Metadata for all the requests in the request builder.
 */
export const RecipesItemImagesItemRequestBuilderRequestsMetadata: RequestsMetadata = {
    delete: {
        uriTemplate: RecipesItemImagesItemRequestBuilderUriTemplate,
        adapterMethodName: "sendNoResponseContent",
    },
};
/* tslint:enable */
/* eslint-enable */
