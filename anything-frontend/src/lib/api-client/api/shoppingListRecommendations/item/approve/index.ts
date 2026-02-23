/* tslint:disable */
/* eslint-disable */
// @ts-ignore
import { type BaseRequestBuilder, type RequestConfiguration, type RequestInformation, type RequestsMetadata } from '@microsoft/kiota-abstractions';

/**
 * Builds and executes requests for operations under /api/shopping-list-recommendations/{id}/approve
 */
export interface ApproveRequestBuilder extends BaseRequestBuilder<ApproveRequestBuilder> {
    /**
     * @param requestConfiguration Configuration for the request such as headers, query parameters, and middleware options.
     * @returns {Promise<void>}
     */
     post(requestConfiguration?: RequestConfiguration<object> | undefined) : Promise<void>;
    /**
     * @param requestConfiguration Configuration for the request such as headers, query parameters, and middleware options.
     * @returns {RequestInformation}
     */
     toPostRequestInformation(requestConfiguration?: RequestConfiguration<object> | undefined) : RequestInformation;
}
/**
 * Uri template for the request builder.
 */
export const ApproveRequestBuilderUriTemplate = "{+baseurl}/api/shopping-list-recommendations/{id}/approve";
/**
 * Metadata for all the requests in the request builder.
 */
export const ApproveRequestBuilderRequestsMetadata: RequestsMetadata = {
    post: {
        uriTemplate: ApproveRequestBuilderUriTemplate,
        adapterMethodName: "sendNoResponseContent",
    },
};
/* tslint:enable */
/* eslint-enable */
