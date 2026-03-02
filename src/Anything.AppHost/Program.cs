var builder = DistributedApplication.CreateBuilder(args);

var postgres = builder
    .AddPostgres("anything-postgres")
    .WithPgAdmin(containerName: "anything-pgadmin")
    .WithDataVolume(isReadOnly: false)
    .AddDatabase("anything");

var minio = builder
    .AddMinio("minio")
    .WithDataVolume()
    .WithMinioConsole();

var minioBucket = minio.AddBucket("recipe-images");

var imgproxy = builder
    .AddContainer("imgproxy", "darthsim/imgproxy", "v3")
    .WithHttpEndpoint(port: 8080, targetPort: 8080, name: "http")
    .WithEnvironment("IMGPROXY_KEY", "0000000000000000000000000000000000000000000000000000000000000000")
    .WithEnvironment("IMGPROXY_SALT", "0000000000000000000000000000000000000000000000000000000000000000")
    .WithEnvironment("IMGPROXY_USE_S3", "true")
    .WithEnvironment("AWS_ACCESS_KEY_ID", "minioadmin")
    .WithEnvironment("AWS_SECRET_ACCESS_KEY", "minioadmin")
    .WithEnvironment("AWS_ENDPOINT", "http://minio:9000")
    .WithEnvironment("AWS_S3_REGION", "us-east-1")
    .WithEnvironment("AWS_S3_FORCE_PATH_STYLE", "true");

var api = builder
    .AddProject<Projects.Anything_API>("anything-api", launchProfileName: "http")
    .WithReference(postgres)
    .WithReference(minio)
    .WithEnvironment("ImageSettings__ImgproxyBaseUrl", imgproxy.GetEndpoint("http"))
    .WithEnvironment("ImageSettings__ImgproxyKey", "0000000000000000000000000000000000000000000000000000000000000000")
    .WithEnvironment("ImageSettings__ImgproxySalt", "0000000000000000000000000000000000000000000000000000000000000000")
    .WaitFor(postgres)
    .WaitFor(minioBucket);

builder.AddJavaScriptApp("anything-frontend", "../../anything-frontend", "dev")
    .WithHttpEndpoint(port: 3001, env: "PORT")
    .WithExternalHttpEndpoints()
    .WithReference(api);

await builder.Build().RunAsync();
