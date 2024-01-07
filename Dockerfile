# --- Build Image ---
FROM registry.access.redhat.com/ubi9/python-39 AS build

WORKDIR /build

# Copy only the requirements file and install the Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# --- Runtime Image ---
FROM build

WORKDIR /app
COPY . /app

# Set the command to run the main.py file when the container launches
ENTRYPOINT ["python", "engine/main.py", "--listen", "0.0.0.0"]
CMD [ "--track", "same" ]
