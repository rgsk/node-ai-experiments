# Use the continuumio/anaconda3 base image
FROM continuumio/anaconda3

# Set the working directory inside the container
WORKDIR /app

# Copy only the dependency file first to leverage Docker caching
COPY requirements.txt /app/

# Install Python dependencies using pip
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . /app