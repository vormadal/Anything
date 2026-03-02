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
// Fetches source images from MinIO via HTTP; no credentials needed since bucket is public-read.
// Production: set MINIO_SOURCE_ENDPOINT and IMAGE_PROXY_BASE_URL in CapRover env vars.
var imgproxy = builder
    .AddContainer("imgproxy", "docker.io/darthsim/imgproxy", "latest")
    .WithHttpEndpoint(targetPort: 8080, name: "http");

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
    // ImageProxyBaseUrl: injected from Aspire's endpoint reference at runtime
    .WithEnvironment("ImageSettings__ImageProxyBaseUrl", imgproxy.GetEndpoint("http"))
    .WaitFor(postgres)
    .WaitFor(minio);

builder.AddJavaScriptApp("anything-frontend", "../../anything-frontend", "dev")
    .WithHttpEndpoint(port: 3001, env: "PORT")
    .WithExternalHttpEndpoints()
    .WithReference(api);

await builder.Build().RunAsync();
