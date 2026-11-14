package com.ft_transcendence.vigil;

import com.ft_transcendence.vigil.cli.ApiAdminCli;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.util.Arrays;

@SpringBootApplication
public class FtTranscendenceApplication {

    public static void main(String[] args) {
        if (args.length > 0 && args[0].equals("admin")) {
            System.exit(ApiAdminCli.run(Arrays.copyOfRange(args, 1, args.length)));
            return;
        }
        SpringApplication.run(FtTranscendenceApplication.class, args);
    }

}
