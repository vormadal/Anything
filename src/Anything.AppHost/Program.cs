var builder = DistributedApplication.CreateBuilder(args);

var postgres = builder
    .AddPostgres("anything-postgres")
    .WithPgAdmin(containerName: "anything-pgadmin")
    .WithDataVolume(isReadOnly: false)
    .AddDatabase("anything");

var minio = builder
    .AddMinioContainer("minio")
    .WithDataVolume();

// imgproxy: open-source image processing proxy (https://github.com/imgproxy/imgproxy)
// The bucket is private (ImageSettings__UseS3Source below), so imgproxy reads
// from MinIO with S3 credentials and the API emits s3://bucket/key source URLs.
// Production: set the same IMGPROXY_USE_S3/S3_ENDPOINT/AWS_* env vars on the
// imgproxy app in CapRover, plus IMAGE_PROXY_BASE_URL for the API.
var imgproxy = builder
    .AddContainer("imgproxy", "docker.io/darthsim/imgproxy", "latest")
    .WithHttpEndpoint(targetPort: 8080, name: "http")
    .WithEnvironment("IMGPROXY_USE_S3", "true")
    .WithEnvironment("IMGPROXY_S3_ENDPOINT", "http://minio:9000")
    .WithEnvironment("AWS_ACCESS_KEY_ID", minio.Resource.RootUser)
    .WithEnvironment("AWS_SECRET_ACCESS_KEY", minio.Resource.PasswordParameter)
    .WithEnvironment("AWS_REGION", "us-east-1");

var api = builder
    .AddProject<Projects.Anything_API>("anything-api", launchProfileName: "http")
    .WithReference(postgres)
    .WithReference(minio)
    .WithEnvironment("ImageSettings__BucketName", "recipe-images")
    .WithEnvironment("ImageSettings__AccessKey", minio.Resource.RootUser)
    .WithEnvironment("ImageSettings__SecretKey", minio.Resource.PasswordParameter)
    .WithEnvironment("ImageSettings__Endpoint", minio.GetEndpoint("http"))
    // MinioSourceEndpoint: the MinIO URL as seen from the image proxy's Docker network
    .WithEnvironment("ImageSettings__MinioSourceEndpoint", "http://minio:9000")
    // Private bucket: no anonymous-read policy; imgproxy uses its S3 credentials above
    .WithEnvironment("ImageSettings__UseS3Source", "true")
    // ImageProxyBaseUrl: injected from Aspire's endpoint reference at runtime
    .WithEnvironment("ImageSettings__ImageProxyBaseUrl", imgproxy.GetEndpoint("http"))
    .WaitFor(postgres)
    .WaitFor(minio);

builder.AddJavaScriptApp("anything-frontend", "../../anything-frontend", "dev")
    .WithHttpEndpoint(port: 3001, env: "PORT")
    .WithExternalHttpEndpoints()
    .WithReference(api);

await builder.Build().RunAsync();
