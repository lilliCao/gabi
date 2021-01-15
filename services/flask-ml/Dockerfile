FROM python:3.7-slim-buster
#RUN apk update
#RUN apk add --virtual build-dependencies build-base gcc libffi-dev libxml2-dev libxslt-dev openssl-dev make g++
#RUN apk add --update-cache --no-cache libgcc libquadmath musl musl-dev \
#    && apk add --update-cache --no-cache libgfortran \
#    && apk add --update-cache --no-cache lapack-dev
##RUN apk --no-cache add lapack libstdc++ && apk --no-cache add --virtual .builddeps g++ gcc gfortran musl-dev lapack-dev && pip3 install scipy && apk del .builddeps && rm -rf /root/.cache
#
#RUN pip3 install --upgrade pip
#RUN pip3 install Cython
#RUN pip3 install flask
#RUN pip3 install numpy
#RUN pip3 install pandas
#RUN pip3 install keras
#RUN pip3 install sklearn
#
#WORKDIR /app
#
#COPY . /app
#
#ENTRYPOINT ["python3", "main.py"]

RUN echo \
   && apt-get update \
   && apt-get --yes install apt-file \
   && apt-file update
RUN echo \
   && apt-get --yes install build-essential
ARG USER=nobody
RUN usermod -aG sudo $USER
RUN pip3 install --upgrade pip
WORKDIR /app
COPY . /app
RUN pip3 --no-cache-dir install -r requirements.txt
USER $USER

ENTRYPOINT ["python"]
CMD ["main.py"]

#EXPOSE 5000
#ENV FLASK_APP=main.py
#ENTRYPOINT [ "flask"]
#CMD [ "run", "--host", "0.0.0.0" ]

