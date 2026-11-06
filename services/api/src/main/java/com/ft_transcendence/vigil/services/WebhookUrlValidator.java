package com.ft_transcendence.vigil.services;

import com.ft_transcendence.vigil.exceptions.InvalidRequestException;
import org.springframework.stereotype.Component;

import java.net.InetAddress;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.UnknownHostException;

@Component
public class WebhookUrlValidator {

    public void validate(String url) {
        URI uri;
        try {
            uri = new URI(url == null ? "" : url);
        } catch (URISyntaxException ex) {
            throw invalidUrl();
        }

        String host = uri.getHost();
        if (!"https".equalsIgnoreCase(uri.getScheme()) || host == null
                || uri.getRawUserInfo() != null || uri.getRawFragment() != null
                || uri.getPort() == 0 || uri.getPort() > 65535) {
            throw invalidUrl();
        }

        if (host.startsWith("[")) {
            host = host.substring(1, host.length() - 1);
        }
        if (host.contains("%")) {
            throw invalidUrl();
        }
        try {
            InetAddress[] addresses = resolve(host);
            if (addresses.length == 0) {
                throw new UnknownHostException();
            }
            if (host.matches("[0-9.]+") && !host.equals(addresses[0].getHostAddress())) {
                throw invalidUrl();
            }
            for (InetAddress address : addresses) {
                if (!isPublicAddress(address)) {
                    throw privateDestination();
                }
            }
        } catch (UnknownHostException ex) {
            throw new InvalidRequestException("webhook hostname could not be resolved");
        }
    }

    InetAddress[] resolve(String host) throws UnknownHostException {
        return InetAddress.getAllByName(host);
    }

    private boolean isPublicAddress(InetAddress address) {
        if (address.isAnyLocalAddress() || address.isLoopbackAddress()
                || address.isLinkLocalAddress() || address.isSiteLocalAddress()
                || address.isMulticastAddress()) {
            return false;
        }
        byte[] bytes = address.getAddress();
        if (bytes.length == 4) {
            int first = bytes[0] & 0xff;
            int second = bytes[1] & 0xff;
            return first != 0 && first < 224
                    && !(first == 100 && second >= 64 && second <= 127);
        }
        return (bytes[0] & 0xe0) == 0x20;
    }

    private InvalidRequestException invalidUrl() {
        return new InvalidRequestException("webhook url must be an HTTPS URL without credentials or a fragment");
    }

    private InvalidRequestException privateDestination() {
        return new InvalidRequestException("webhook url must resolve only to public IP addresses");
    }
}
