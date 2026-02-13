using Anything.API.Data;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.AddServiceDefaults();

// Add PostgreSQL with Entity Framework
builder.AddNpgsqlDbContext<ApplicationDbContext>("postgres");

// Add OpenAPI/Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "Anything API", Version = "v1" });
});

// Add CORS
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins("http://localhost:3000", "https://localhost:3000")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

app.MapDefaultEndpoints();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Anything API v1");
    });
}

app.UseCors();

// Sample API endpoints
app.MapGet("/api/todos", async (ApplicationDbContext db) =>
{
    return await db.TodoItems.ToListAsync();
})
.WithName("GetTodos");

app.MapGet("/api/todos/{id}", async (int id, ApplicationDbContext db) =>
{
    return await db.TodoItems.FindAsync(id) is TodoItem todo
        ? Results.Ok(todo)
        : Results.NotFound();
})
.WithName("GetTodoById");

app.MapPost("/api/todos", async (TodoItem todo, ApplicationDbContext db) =>
{
    db.TodoItems.Add(todo);
    await db.SaveChangesAsync();
    return Results.Created($"/api/todos/{todo.Id}", todo);
})
.WithName("CreateTodo");

app.MapPut("/api/todos/{id}", async (int id, TodoItem inputTodo, ApplicationDbContext db) =>
{
    var todo = await db.TodoItems.FindAsync(id);
    if (todo is null) return Results.NotFound();

    todo.Title = inputTodo.Title;
    todo.Description = inputTodo.Description;
    todo.IsCompleted = inputTodo.IsCompleted;

    await db.SaveChangesAsync();
    return Results.NoContent();
})
.WithName("UpdateTodo");

app.MapDelete("/api/todos/{id}", async (int id, ApplicationDbContext db) =>
{
    if (await db.TodoItems.FindAsync(id) is TodoItem todo)
    {
        db.TodoItems.Remove(todo);
        await db.SaveChangesAsync();
        return Results.NoContent();
    }
    return Results.NotFound();
})
.WithName("DeleteTodo");

app.Run();
