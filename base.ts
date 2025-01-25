const v = "6cf574d8-aaf9-4b95-92e0-bba4edf7bdda";

// replace non - character by _

const sanitized = v.replace(/[a-zA-Z0-9]/g, "_");
console.log(sanitized);
