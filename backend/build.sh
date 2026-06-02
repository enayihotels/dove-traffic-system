# #!/usr/bin/env bash
# set -o errexit

# echo "─── Installing Python dependencies ───"
# python -m pip install --upgrade pip
# python -m pip install -r requirements.txt

# echo "─── Running database migrations ───"
# python manage.py migrate --noinput

# echo "─── Collecting static files ───"
# python manage.py collectstatic --noinput --clear

# echo "─── Build complete ───"
#!/usr/bin/env bash
set -o errexit

echo "─── Installing Python dependencies ───"
python -m pip install --upgrade pip
python -m pip install -r requirements.txt

echo "─── Skipping migrations temporarily (fix manually via shell) ───"

echo "─── Collecting static files ───"
python manage.py collectstatic --noinput --clear

echo "─── Build complete ───"