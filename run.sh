#!/usr/bin/env bash

set -e

unset CDPATH
cd "$( dirname "${BASH_SOURCE[0]}" )"

echo() { builtin echo "[SCITRAN] $@"; }


set -o allexport

if [ "$#" -eq 1 ]; then
    EXISTING_ENV=$(env | grep "SCITRAN_" | cat)
    source "$1"
    eval "$EXISTING_ENV"
fi
if [ "$#" -gt 1 ]; then
    echo "Usage: $0 [config file]"
    exit 1
fi


# Default config values
if [ -z "$SCITRAN_SYSTEM_HOST" ]; then
    SCITRAN_SYSTEM_HOST="127.0.0.1"
fi
if [ -z "$SCITRAN_SYSTEM_PORT" ]; then
    SCITRAN_SYSTEM_PORT="8080"
fi
if [ -z "$SCITRAN_SYSTEM_RUNTIME" ]; then
    SCITRAN_SYSTEM_RUNTIME="./runtime"
fi
if [ -z "$SCITRAN_SYSTEM_SSL_PEM" ]; then
    SCITRAN_SYSTEM_SSL_PEM=""
fi
if [ -z "$SCITRAN_SYSTEM_BOOTSTRAP" ]; then
    SCITRAN_SYSTEM_BOOTSTRAP="bootstrap.json"
fi
if [ -z "$SCITRAN_PERSISTENT_PATH" ]; then
    SCITRAN_PERSISTENT_PATH="./persistent"
fi
if [ -z "$SCITRAN_PERSISTENT_DATA_PATH" ]; then
    SCITRAN_PERSISTENT_DATA_PATH="$SCITRAN_PERSISTENT_PATH/data"
fi
if [ -z "$SCITRAN_PERSISTENT_DB_PATH" ]; then
    SCITRAN_PERSISTENT_DB_PATH="$SCITRAN_PERSISTENT_PATH/db"
fi
if [ -z "$SCITRAN_PERSISTENT_DB_PORT" ]; then
    SCITRAN_PERSISTENT_DB_PORT="9001"
fi
if [ -z "$SCITRAN_PERSISTENT_DB_URI" ]; then
    SCITRAN_PERSISTENT_DB_URI="mongodb://localhost:$SCITRAN_PERSISTENT_DB_PORT/scitran"
fi

set +o allexport


if [ ! -d "scitran_api" ]; then
    git clone -b paster-aloha https://github.com/scitran/api.git scitran_api
fi
if [ ! -d "scitran_data" ]; then
    git clone -b aloha https://github.com/scitran/data.git scitran_data
fi

if [ -f "$SCITRAN_PERSISTENT_DB_PATH/mongod.lock" ]; then
    BOOTSTRAP_USERS=0
else
    echo "Creating database location at $SCITRAN_PERSISTENT_DB_PATH"
    mkdir -p $SCITRAN_PERSISTENT_DB_PATH
    if ! [ -f "$SCITRAN_SYSTEM_BOOTSTRAP" ]; then
        echo "Aborting. Please create $SCITRAN_SYSTEM_BOOTSTRAP from api/bootstrap.json.sample."
        exit 1
    fi
    BOOTSTRAP_USERS=1
fi


if [ -f "`which brew`" ]; then
    echo "Homebrew is installed"
else
    echo "Installing Homebrew"
    ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"
    echo "Installed Homebrew"
fi

if brew list | grep -q openssl; then
    echo "OpenSSL is installed"
else
    echo "Installing OpenSSL"
    brew install openssl
    echo "Installed OpenSSL"
fi

if brew list | grep -q python; then
    echo "Python is installed"
else
    echo "Installing Python"
    brew install python
    echo "Installed Python"
fi

if [ -f "`which virtualenv`" ]; then
    echo "Virtualenv is installed"
else
    echo "Installing Virtualenv"
    pip install virtualenv
    echo "Installed Virtualenv"
fi

if [ -d "$SCITRAN_SYSTEM_RUNTIME" ]; then
    echo "Virtualenv exists present at $SCITRAN_SYSTEM_RUNTIME"
else
    echo "Creating 'scitran' Virtualenv at $SCITRAN_SYSTEM_RUNTIME"
    virtualenv -p `brew --prefix`/bin/python --prompt="(scitran)" $SCITRAN_SYSTEM_RUNTIME
    echo "Created 'scitran' Virtualenv at $SCITRAN_SYSTEM_RUNTIME"
fi

if [ -f "$SCITRAN_SYSTEM_RUNTIME/bin/mongod" ]; then
    echo "MongoDB is installed"
else
    echo "Installing MongoDB"
    curl https://fastdl.mongodb.org/osx/mongodb-osx-x86_64-3.0.7.tgz | tar xz -C $SCITRAN_SYSTEM_RUNTIME --strip-components 1
    echo "MongoDB installed"
fi


echo "Activating Virtualenv"
source $SCITRAN_SYSTEM_RUNTIME/bin/activate

echo "Installing Python requirements"
pip install -r requirements/0-prereqs.basic.txt
pip install -r requirements/1-deps.wheels.txt
pip install -r requirements/2-scientific.wheels.txt
pip install -r requirements/3-source.install.txt

pip install pastescript
pip install -e scitran_data


# Launch mongod
mongod --dbpath $SCITRAN_PERSISTENT_DB_PATH --smallfiles --port $SCITRAN_PERSISTENT_DB_PORT &
MONGO_PID=$!

# Set python path so scripts can work
export PYTHONPATH=./scitran_api

# Boostrap users
if [ $BOOTSTRAP_USERS -eq 1 ]; then
    echo "Bootstrapping users"
    scitran_api/bin/bootstrap.py users "mongodb://localhost:$SCITRAN_PERSISTENT_DB_PORT/scitran" "$SCITRAN_SYSTEM_BOOTSTRAP"
else
    echo "Database exists at $SCITRAN_PERSISTENT_PATH/db. Not bootstrapping users."
fi

TESTDATA_URL="https://github.com/scitran/testdata/archive/aloha.tar.gz"
TESTDATA_VERSION=$(curl -sLI $TESTDATA_URL | grep ETag | tail -n 1 | cut -f 2 -d '"')
if [ ! -d "$SCITRAN_PERSISTENT_PATH/testdata" ]; then
    echo "Downloading testdata to $SCITRAN_PERSISTENT_PATH/testdata"
    mkdir "$SCITRAN_PERSISTENT_PATH/testdata"
    curl -L $TESTDATA_URL | tar xz -C "$SCITRAN_PERSISTENT_PATH/testdata" --strip-components 1
else
    if [ "$TESTDATA_VERSION" != "$(cat $SCITRAN_PERSISTENT_PATH/.testdata_version)" ]; then
        echo "Testdata out of date; downloading"
        curl -L $TESTDATA_URL | tar xz -C "$SCITRAN_PERSISTENT_PATH/testdata" --strip-components 1
    else
        echo "Testdata up to date"
    fi
fi
builtin echo "$TESTDATA_VERSION" > "$SCITRAN_PERSISTENT_PATH/.testdata_version"

if [ -f "$SCITRAN_PERSISTENT_DATA_PATH/.bootstrapped" ]; then
    echo "Persistence store exists at $SCITRAN_PERSISTENT_PATH/data. Not bootstrapping data. Remove to re-bootstrap."
else
    echo "Bootstrapping testdata"
    TEMPDIR=$(mktemp -d -t tmp)
    cp -a "$SCITRAN_PERSISTENT_PATH/testdata" "$TEMPDIR"
    scitran_api/bin/bootstrap.py sort "mongodb://localhost:$SCITRAN_PERSISTENT_DB_PORT/scitran" "$TEMPDIR/testdata" "$SCITRAN_PERSISTENT_DATA_PATH"
    echo "Bootstrapped testdata"
    touch "$SCITRAN_PERSISTENT_DATA_PATH/.bootstrapped"
fi


# Serve API with PasteScript
TEMP_INI_FILE=$(mktemp -t scitran_api)
cat << EOF > $TEMP_INI_FILE
[server:main]
use = egg:Paste#http
host = $SCITRAN_SYSTEM_HOST
port = $SCITRAN_SYSTEM_PORT
ssl_pem = $SCITRAN_SYSTEM_SSL_PEM

[composite:main]
use = egg:Paste#cascade
app1 = sdm
app2 = api

[app:sdm]
use = egg:Paste#static
document_root = .

[app:api]
paste.app_factory = api.paster:app_factory
data_path = $SCITRAN_PERSISTENT_DATA_PATH
api_uri = https://$SCITRAN_SYSTEM_HOST:$SCITRAN_SYSTEM_PORT/api
insecure = true
EOF

paster serve --reload $TEMP_INI_FILE

# Clean up and exit out of the python virtualenv
rm -f $TEMP_INI_FILE
deactivate

# Shutdown mongod on ctrl+C
kill $MONGO_PID
wait $MONGO_PID
