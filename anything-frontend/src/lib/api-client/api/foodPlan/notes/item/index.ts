/* tslint:disable */
/* eslint-disable */
// @ts-ignore
import { type BaseRequestBuilder, type RequestConfiguration, type RequestInformation, type RequestsMetadata } from '@microsoft/kiota-abstractions';

/**
 * Builds and executes requests for operations under /api/food-plan/notes/{noteId}
 */
export interface NotesItemRequestBuilder extends BaseRequestBuilder<NotesItemRequestBuilder> {
    /**
     * @param requestConfiguration Configuration for the request such as headers, query parameters, and middleware options.
     * @returns {Promise<void>}
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
export const NotesItemRequestBuilderUriTemplate = "{+baseurl}/api/food-plan/notes/{noteId}";
/**
 * Metadata for all the requests in the request builder.
 */
export const NotesItemRequestBuilderRequestsMetadata: RequestsMetadata = {
    delete: {
        uriTemplate: NotesItemRequestBuilderUriTemplate,
        adapterMethodName: "sendNoResponseContent",
        responseBodyFactory: undefined,
    },
};
/* tslint:enable */
/* eslint-enable */
