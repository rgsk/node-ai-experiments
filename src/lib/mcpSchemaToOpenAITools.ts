function mcpSchemaToOpenAITools(inputSchema: any) {
  if (!inputSchema.tools || !Array.isArray(inputSchema.tools)) {
    throw new Error("Input must contain a tools array");
  }

  return inputSchema.tools.map((tool: any) => {
    // Get the input schema from the tool
    const schema = tool.inputSchema;
    // Create a shallow copy and remove the $schema property
    const cleanedSchema = { ...schema };
    delete cleanedSchema.$schema;

    // If the schema has a properties object, remove any "format" property from each property
    if (cleanedSchema.properties) {
      const newProperties: Record<string, any> = {};
      for (const key in cleanedSchema.properties) {
        // Create a shallow copy of the property object
        const propSchema = { ...cleanedSchema.properties[key] };
        delete propSchema.format; // Remove the format property
        newProperties[key] = propSchema;
      }
      cleanedSchema.properties = newProperties;
    }

    return {
      type: "function",
      function: {
        name: tool.name,
        description: tool.description || `Execute the ${tool.name} function`,
        parameters: cleanedSchema,
        strict: false,
      },
    };
  });
}
export default mcpSchemaToOpenAITools;
