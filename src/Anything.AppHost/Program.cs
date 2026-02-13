var builder = DistributedApplication.CreateBuilder(args);

var postgres = builder.AddPostgres("postgres")
    .WithDataVolume();

var postgresDb = postgres.AddDatabase("postgres");

// Note: To properly reference API project, we need the Aspire SDK
// For now, we'll just configure the database
// The API project can run standalone with the connection string

builder.Build().Run();


