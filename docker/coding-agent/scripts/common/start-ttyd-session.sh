#!/bin/bash
# Start a ttyd session for extra terminal tabs
exec ttyd --writable -p "${PORT}" "$@"
